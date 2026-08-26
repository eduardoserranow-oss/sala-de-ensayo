# FORTISSIMO — Reference Finder setup

## Pendiente cuando vuelva a la computadora

1. Abrir Vercel → proyecto `fortissimoapp` → Settings → Environment Variables.
2. Agregar `CYANITE_WEBHOOK_SECRET` con el Webhook Secret generado en Cyanite.
3. Agregar `CYANITE_API_KEY` con la API Key de Cyanite.
4. Aplicar ambas variables a Production, Preview y Development.
5. Guardar y hacer Redeploy del último deployment.
6. Volver a Cyanite → integración `FORTISSIMO Reference Finder`.
7. Confirmar Webhook URL: `https://fortissimoapp.vercel.app/api/cyanite/webhook`.
8. Pulsar `Send Test Event`.
9. Confirmar en FORTISSIMO/Vercel que el webhook respondió 200.
10. Hacer la primera prueba con un MP3 real y confirmar: upload → análisis → webhook → lectura de resultados.

## Ya preparado

- Endpoint Cyanite: `api/cyanite/webhook.js`.
- Verificación segura de firmas del webhook.
- Tabla privada `reference_finder_jobs` en Supabase para registrar trabajos de análisis.
- Bucket privado `reference-finder-uploads` en Supabase.
- Límite del bucket: 20 MB, alineado con el límite documentado por Cyanite.
- El bucket no es público.
- La tabla tiene RLS activado y no se expone directamente al cliente por ahora.

## Arquitectura de subida prevista

No se enviarán archivos grandes atravesando directamente una Vercel Function. El navegador subirá el audio a almacenamiento privado mediante un flujo firmado; el backend enviará el archivo a Cyanite usando la API Key solo del lado del servidor. Así la API Key nunca llega al navegador y los audios de clientes no se vuelven públicos.

## Primera familia de datos a extraer de Cyanite

- BPM / tempo
- Key
- Time signature
- Main genre / subgenre / free genre
- Instruments
- Mood simple / advanced
- Movement / groove
- Character
- Valence / arousal / energy
- Segmentation
- Representative segment
- Vocals

Después de validar estos datos con canciones reales, FORTISSIMO añadirá su propia capa de `Production Match` para priorizar drums, bass/808, sound palette, groove y mood.