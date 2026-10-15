# Source-card paintings (torah edition), 512px webp. Built by tools/build-source-art.py
import base64,glob,os,json
m={}
for f in sorted(glob.glob('art/sources/*.webp')):
    m[os.path.basename(f)[:-5]]='data:image/webp;base64,'+base64.b64encode(open(f,'rb').read()).decode()
with open('src/data/source-art.js','w') as fh:
    fh.write('// Source-card paintings (torah edition, 512px webp). Built by tools/build-source-art.py\n')
    fh.write('export const SOURCE_ART = '+json.dumps(m,separators=(',',':'))+';\n')
print(len(m),'images',os.path.getsize('src/data/source-art.js')//1024,'KB')
