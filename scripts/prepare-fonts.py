"""Recover Inter from a locally cached Fontsource 5.2.8 archive, without network access.

WOFF stores the original SFNT tables compressed with zlib. This script restores
those tables as TTF, retaining the glyphs and font names, then fixes the checksum.
"""
import base64
import hashlib
import json
from io import BytesIO
from pathlib import Path
import struct
import sys
import tarfile
import zlib

EXPECTED = 'P6r5WnJoKiNVV+zvW2xM13gNdFhAEpQ9dQJHt3naLvfg+LkF2ldgSLiF4T41lf1SQCM9QmkqPTn4TH568IRagg=='


def checksum(data):
    padded = data + b'\0' * (-len(data) % 4)
    return sum(struct.unpack(f'>{len(padded) // 4}I', padded)) & 0xFFFFFFFF


def restore_ttf(woff):
    signature, flavor, length, count = struct.unpack_from('>4sIIH', woff)
    if signature != b'wOFF' or flavor != 0x10000 or length != len(woff):
        raise ValueError('Expected a complete TrueType WOFF file.')
    tables = []
    for i in range(count):
        tag, offset, compressed, original, _ = struct.unpack_from('>4sIIII', woff, 44 + i * 20)
        data = woff[offset:offset + compressed]
        if compressed < original:
            data = zlib.decompress(data)
        if len(data) != original:
            raise ValueError('Invalid font table length.')
        if tag == b'head':
            data = data[:8] + b'\0' * 4 + data[12:]
        tables.append((tag, data))
    power = count.bit_length() - 1
    result = bytearray(struct.pack('>IHHHH', flavor, count, 16 * 2 ** power, power, count * 16 - 16 * 2 ** power))
    table_data = bytearray()
    offset = 12 + count * 16
    head_offset = None
    for tag, data in sorted(tables):
        result.extend(struct.pack('>4sIII', tag, checksum(data), offset, len(data)))
        if tag == b'head':
            head_offset = offset
        padded = data + b'\0' * (-len(data) % 4)
        table_data.extend(padded)
        offset += len(padded)
    result.extend(table_data)
    if head_offset is None:
        raise ValueError('Missing font header.')
    adjustment = (0xB1B0AFBA - checksum(result)) & 0xFFFFFFFF
    struct.pack_into('>I', result, head_offset + 8, adjustment)
    if checksum(result) != 0xB1B0AFBA:
        raise ValueError('Invalid SFNT checksum.')
    return bytes(result)


def main():
    archive = Path(sys.argv[1]).read_bytes()
    if hashlib.sha512(archive).digest() != base64.b64decode(EXPECTED):
        raise ValueError('Archive does not match Fontsource Inter 5.2.8 integrity.')
    destination = Path(__file__).resolve().parents[1] / 'assets' / 'fonts'
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=BytesIO(archive)) as package:
        for weight, name in [(400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold')]:
            source = package.extractfile(f'package/files/inter-latin-{weight}-normal.woff')
            if source is None:
                raise ValueError('Font missing from archive.')
            data = restore_ttf(source.read())
            (destination / f'Inter-{name}.ttf').write_bytes(data)
            print(f'Inter-{name}.ttf: {len(data)} bytes; SFNT checksum verified')
        license_file = package.extractfile('package/LICENSE')
        if license_file is None:
            raise ValueError('Font license missing.')
        license_text = license_file.read().decode('utf-8')
        (destination / 'LICENSE.txt').write_text(license_text)
        license_json = destination.parents[1] / 'src' / 'theme' / 'font-license.json'
        license_json.write_text(json.dumps({'text': license_text}, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
