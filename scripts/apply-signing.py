#!/usr/bin/env python3
import re
import sys

gradle_path = sys.argv[1] if len(sys.argv) > 1 else 'android/app/build.gradle'

with open(gradle_path, 'r') as f:
    content = f.read()

signing_block = '''
    signingConfigs {
        debug {
            storeFile file('fitchrono-release.p12')
            storePassword 'fitchrono2026'
            keyAlias 'fitchrono'
            keyPassword 'fitchrono2026'
            storetype 'pkcs12'
        }
    }
'''

if 'signingConfigs' not in content:
    content = re.sub(r'(android\s*\{)', r'\1' + signing_block, content)

if 'signingConfig signingConfigs.debug' not in content:
    content = re.sub(
        r'(buildTypes\s*\{)',
        r'\1\n        debug {\n            signingConfig signingConfigs.debug\n        }\n',
        content
    )

with open(gradle_path, 'w') as f:
    f.write(content)

print("Signing config applied to", gradle_path)
