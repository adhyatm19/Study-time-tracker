"""Generate small, original looping ambience textures with no external assets."""
import math, random, struct, wave
from pathlib import Path
random.seed(24092026)
rate, length = 22050, 12
output = Path('public/audio')
output.mkdir(parents=True, exist_ok=True)
for name in ['white-noise', 'rain', 'fireplace']:
    samples, smooth, ember = [], 0., 0.
    for i in range(rate * length):
        noise = random.uniform(-1, 1)
        smooth = .98 * smooth + .02 * noise
        if name == 'white-noise':
            value = noise * .11
        elif name == 'rain':
            value = noise * .075 + smooth * .6
        else:
            if random.random() < .0007:
                ember = random.uniform(.12, .4)
            ember *= .985
            value = smooth * .9 + ember * noise
        # Short matching quiet boundaries avoid a discontinuity at loop restart.
        fade = min(1., i / (rate * .04), (rate * length - 1 - i) / (rate * .04))
        samples.append(struct.pack('<h', int(max(-1, min(1, value * fade)) * 32767)))
    with wave.open(str(output / (name + '.wav')), 'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(rate)
        audio.writeframes(b''.join(samples))
