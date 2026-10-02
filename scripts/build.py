"""Build an offline, single-file edition using only Python's standard library."""
from pathlib import Path
import base64
import zipfile

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'

def main():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    count=0
    for asset in sorted((ROOT/'assets').rglob('*')):
        if not asset.is_file() or asset.suffix.lower() not in ('.png','.jpeg','.jpg'):
            continue
        relative=asset.relative_to(ROOT).as_posix()
        if relative not in html:
            raise ValueError(f'Imagen sin referencia en la aplicación: {relative}')
        mime='image/png' if asset.suffix.lower()=='.png' else 'image/jpeg'
        data=f'data:{mime};base64,'+base64.b64encode(asset.read_bytes()).decode('ascii')
        html=html.replace(relative,data)
        count+=1
    if count!=40:
        raise ValueError(f'Se esperaban 40 imágenes, se encontraron {count}.')
    DIST.mkdir(exist_ok=True)
    target=DIST/'Startup-Arena.html'
    target.write_text(html,encoding='utf-8')
    guide='''STARTUP ARENA

Extrae el ZIP y abre Startup-Arena.html en un navegador moderno.
No necesita internet, servidor ni instalación. Las 40 imágenes están integradas.
Consulta «La actividad» y «Guía del docente» dentro de la aplicación.

Los datos se guardan en el navegador. Conserva el archivo en la misma ubicación
y usa el mismo navegador para continuar una ronda. Este ZIP no incluye rondas
guardadas. Reiniciar sorteo elimina todos los datos de la ronda, previa confirmación.
'''
    with zipfile.ZipFile(DIST/'Startup-Arena.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        archive.write(target,'Startup-Arena.html')
        archive.writestr('LEEME.txt',guide.encode('utf-8-sig'))
    print(f'Generados dist/Startup-Arena.html y dist/Startup-Arena.zip con {count} imágenes integradas.')

if __name__=='__main__':
    main()
