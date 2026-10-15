import base64,glob,os,json
src='art'; out='src/data/card-art.js'
m={}
for f in sorted(glob.glob(src+'/*.webp')):
    m[os.path.basename(f)[:-5]]='data:image/webp;base64,'+base64.b64encode(open(f,'rb').read()).decode()
with open(out,'w') as fh:
    fh.write('// Card illustrations (generated, 256px webp). Built by tools/build-card-art.py\n')
    fh.write('export const CARD_ART = '+json.dumps(m,separators=(',',':'))+';\n')
print(len(m),'images',os.path.getsize(out)//1024,'KB')
