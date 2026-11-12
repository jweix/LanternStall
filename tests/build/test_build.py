"""验证迁移后的真实构建、平台资源覆盖和跨平台隔离。"""
import base64
from contextlib import contextmanager
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_lib import ASSET_TOKENS, load_platform, read_json, render_preview, resolve_asset


@contextmanager
def asset_fixture():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        shutil.copy2(ROOT / 'project.json', root / 'project.json')
        shutil.copytree(ROOT / 'shared/assets', root / 'shared/assets')
        project = read_json(root / 'project.json')
        for platform_id, relative in project['platforms'].items():
            target = root / relative
            target.parent.mkdir(parents=True)
            shutil.copy2(ROOT / relative, target)
            shutil.copytree(ROOT / 'platforms' / platform_id / 'assets', target.parent / 'assets')
        yield root


def write_override(root, assets):
    manifest = root / 'platforms/web-preview/assets/manifest.json'
    manifest.write_text(json.dumps({'schemaVersion': 1, 'assets': assets}), encoding='utf-8')


class BuildTests(unittest.TestCase):
    def test_all_registered_platform_paths_and_assets_exist(self):
        project = read_json(ROOT / 'project.json')
        self.assertEqual(set(project['platforms']),
                         {'web-preview', 'wechat', 'douyin', 'xiaohongshu', 'overseas'})
        outputs = set()
        shared_assets = read_json(ROOT / project['shared']['assets'])['assets']
        for platform_id in project['platforms']:
            _, platform, directory = load_platform(platform_id)
            self.assertTrue((directory / platform['source']).is_dir())
            self.assertEqual(platform['output'], f'dist/{platform_id}')
            self.assertNotIn(platform['output'], outputs)
            outputs.add(platform['output'])
            for asset_id, variants in shared_assets.items():
                for variant in variants:
                    resolve_asset(platform_id, asset_id, variant)

    def test_runtime_bundle_is_self_contained_and_uses_runtime_assets(self):
        fragment, output = render_preview()
        self.assertEqual(output, ROOT / 'dist/web-preview')
        self.assertLess(len(fragment.encode('utf-8')), 1_000_000)
        self.assertNotRegex(fragment, r'/\*__[A-Z_]+__\*/')
        for asset_id in ASSET_TOKENS.values():
            asset, mime = resolve_asset('web-preview', asset_id)
            encoded = base64.b64encode(asset.read_bytes()).decode('ascii')
            self.assertIn(f'data:{mime};base64,{encoded}', fragment)
        self.assertLess(fragment.index('class LanternGame'), fragment.index('host.LanternPlatform'))
        self.assertLess(fragment.index('host.LanternPlatform'), fragment.index('LanternPlatform.loadGame()'))
        for obsolete in ['data-refuse', 'data-confirm-refuse', '撕单', '赔付']:
            self.assertNotIn(obsolete, fragment)

    def test_hd_bundle_urls_resolve_to_original_art(self):
        fragment, output = render_preview(high_resolution=True)
        urls = re.findall(r"url\('([^']+)'\)", fragment)
        expected = {resolve_asset('web-preview', key, 'source')[0].resolve()
                    for key in ASSET_TOKENS.values()}
        self.assertEqual({(output / url).resolve() for url in urls}, expected)
        self.assertNotIn('data:image/', fragment)

    def test_planned_platforms_cannot_emit_browser_release_stubs(self):
        for platform_id in ['wechat', 'douyin', 'xiaohongshu', 'overseas']:
            with self.assertRaisesRegex(ValueError, 'no browser preview build'):
                render_preview(platform_id)

    def test_platform_override_keeps_other_platforms_and_source_unchanged(self):
        with asset_fixture() as root:
            original, _ = resolve_asset('web-preview', 'ingredientAtlas', root=root)
            original_bytes = original.read_bytes()
            source, _ = resolve_asset('web-preview', 'ingredientAtlas', 'source', root)
            replacement = root / 'platforms/web-preview/assets/food.png'
            replacement.write_bytes(original_bytes)
            write_override(root, {'ingredientAtlas': {
                'runtime': {'path': 'food.png', 'mimeType': 'image/png'}}})
            self.assertEqual(resolve_asset('web-preview', 'ingredientAtlas', root=root)[0], replacement)
            self.assertEqual(resolve_asset('wechat', 'ingredientAtlas', root=root)[0], original)
            self.assertEqual(resolve_asset('web-preview', 'ingredientAtlas', 'source', root)[0], source)
            self.assertEqual(original.read_bytes(), original_bytes)

    def test_explicit_missing_override_fails_instead_of_silent_fallback(self):
        with asset_fixture() as root:
            write_override(root, {'ingredientAtlas': {
                'runtime': {'path': 'missing.png', 'mimeType': 'image/png'}}})
            with self.assertRaises(FileNotFoundError):
                resolve_asset('web-preview', 'ingredientAtlas', root=root)

    def test_mistyped_asset_override_is_reported(self):
        with asset_fixture() as root:
            write_override(root, {'ingredientAtals': {
                'runtime': {'path': 'food.png', 'mimeType': 'image/png'}}})
            with self.assertRaisesRegex(ValueError, 'Unknown asset overrides'):
                resolve_asset('web-preview', 'ingredientAtlas', root=root)


if __name__ == '__main__':
    unittest.main()
