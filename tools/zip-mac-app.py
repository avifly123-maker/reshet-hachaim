#!/usr/bin/env python3
"""Zip a macOS .app for download: keeps symlinks (framework Versions/Current) and exec bits, UTF-8 names, and lets
you rename the bundle (e.g. to its Hebrew product name). Linux's electron-builder zip follows the symlinks, which
triples the size and breaks the code signature – this keeps the bundle byte-for-byte as signed.
usage: zip-mac-app.py <path/to/X.app> <out.zip> [<name inside the zip>.app]"""
import os, stat, sys, zipfile
src, out = sys.argv[1].rstrip('/'), sys.argv[2]
name = sys.argv[3] if len(sys.argv) > 3 else os.path.basename(src)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, dirs, files in os.walk(src, followlinks=False):
        rel_root = os.path.relpath(root, src)
        entries = [(d, True) for d in dirs] + [(f, False) for f in files]
        for n, is_dir in entries:
            p = os.path.join(root, n)
            arc = os.path.normpath(os.path.join(name, rel_root, n))
            st = os.lstat(p)
            if stat.S_ISLNK(st.st_mode):
                zi = zipfile.ZipInfo(arc); zi.create_system = 3
                zi.external_attr = (0o120755 << 16)
                z.writestr(zi, os.readlink(p), compress_type=zipfile.ZIP_STORED)
                if is_dir: dirs.remove(n)
            elif is_dir:
                zi = zipfile.ZipInfo(arc + '/'); zi.create_system = 3
                zi.external_attr = (0o40755 << 16) | 0x10
                z.writestr(zi, b'')
            else:
                zi = zipfile.ZipInfo.from_file(p, arc); zi.create_system = 3
                zi.external_attr = (st.st_mode & 0xFFFF) << 16
                zi.compress_type = zipfile.ZIP_DEFLATED
                with open(p, 'rb') as fh: z.writestr(zi, fh.read(), compresslevel=9)
print(out, os.path.getsize(out))
