"""Deterministic, original quiet UI/food cues; mono PCM, no external recordings."""
import math
import random
import wave
from pathlib import Path

root = Path(__file__).resolve().parent.parent / 'shared/assets/audio'
root.mkdir(exist_ok=True)
rate = 11025
for name, duration, notes in [
    ('pick', .065, [620]), ('match', .19, [523, 659, 784]),
    ('cook', .19, []), ('coin', .14, [1046, 1318]),
    ('win', .38, [523, 659, 784, 1046]), ('soft', .14, [330, 294]),
]:
    rng = random.Random(name)
    samples = []
    low = 0
    for i in range(round(rate * duration)):
        t = i / rate
        envelope = min(1, t / .008) * min(1, (duration-t) / .035)
        if notes:
            frequency = notes[min(len(notes)-1, int(t/duration*len(notes)))]
            value = (math.sin(2*math.pi*frequency*t) + .12*math.sin(4*math.pi*frequency*t)) * .32
        else:
            low = .7*low + .3*rng.uniform(-1,1)
            value = low * .55 * (.7+.3*math.sin(t*90))
        samples.append(max(0, min(255, round(128 + 95*value*envelope))))
    with wave.open(str(root / (name+'.wav')), 'wb') as audio:
        audio.setparams((1, 1, rate, 0, 'NONE', 'not compressed'))
        audio.writeframes(bytes(samples))
print('Prepared 6 original sound cues')
