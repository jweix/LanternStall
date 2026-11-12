"""共享构建入口：按清单读取代码，并应用当前平台的资源覆盖。"""
import base64
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_TOKENS = {
    '__INGREDIENT_ATLAS__': 'ingredientAtlas',
    '__STALL_SCENE__': 'stallScene',
    '__COOKING_ATLAS__': 'cookingAtlas',
}


def read_json(path):
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('schemaVersion') != 1:
        raise ValueError(f'Unsupported schemaVersion: {path}')
    return data


def load_platform(platform_id, root=ROOT):
    project = read_json(root / 'project.json')
    if platform_id not in project['platforms']:
        raise ValueError(f'Unknown platform: {platform_id}')
    config_path = root / project['platforms'][platform_id]
    platform = read_json(config_path)
    if platform['id'] != platform_id:
        raise ValueError(f'Platform id mismatch: {config_path}')
    return project, platform, config_path.parent


def resolve_asset(platform_id, asset_id, variant='runtime', root=ROOT):
    """同一逻辑资源优先使用平台覆盖；未覆盖的版本读取共享素材。"""
    project, platform, platform_dir = load_platform(platform_id, root)
    shared_path = root / project['shared']['assets']
    override_path = platform_dir / platform['assets']
    shared = read_json(shared_path)['assets']
    overrides = read_json(override_path)['assets']
    unknown = overrides.keys() - shared.keys()
    if unknown:
        raise ValueError(f'Unknown asset overrides in {override_path}: {sorted(unknown)}')
    if asset_id not in shared:
        raise ValueError(f'Unknown asset: {asset_id}')
    entry = overrides.get(asset_id, {}).get(variant)
    if entry is None:
        entry = shared[asset_id].get(variant)
        manifest_dir = shared_path.parent
    else:
        manifest_dir = override_path.parent
    if entry is None:
        raise ValueError(f'Missing {variant} asset: {asset_id}')
    asset_path = manifest_dir / entry['path']
    if not asset_path.is_file():
        raise FileNotFoundError(asset_path)
    return asset_path, entry['mimeType']


def render_preview(platform_id='web-preview', high_resolution=False, root=ROOT):
    project, platform, platform_dir = load_platform(platform_id, root)
    build = platform['build']
    if platform['runtime'] != 'dom' or not build:
        raise ValueError(f'{platform_id}: no browser preview build is configured (status={platform["status"]})')
    output_dir = root / platform['output']
    template = (platform_dir / build['template']).read_text(encoding='utf-8')
    theme = (platform_dir / build['theme']).read_text(encoding='utf-8')
    script_paths = [root / item for item in project['shared']['scripts']]
    script_paths.extend(platform_dir / item for item in build['scripts'])
    scripts = '\n'.join(item.read_text(encoding='utf-8') for item in script_paths)

    for token, asset_id in ASSET_TOKENS.items():
        asset_path, mime_type = resolve_asset(
            platform_id, asset_id, 'source' if high_resolution else 'runtime', root)
        if high_resolution:
            url = Path(os.path.relpath(asset_path, output_dir)).as_posix()
        else:
            encoded = base64.b64encode(asset_path.read_bytes()).decode('ascii')
            url = f'data:{mime_type};base64,{encoded}'
        if theme.count(token) != 1:
            raise ValueError(f'Expected one asset token: {token}')
        theme = theme.replace(token, url)

    for token, content in [('/*__THEME_CSS__*/', theme), ('/*__RUNTIME_SCRIPTS__*/', scripts)]:
        if template.count(token) != 1:
            raise ValueError(f'Expected one template token: {token}')
        template = template.replace(token, content)
    return template, output_dir
