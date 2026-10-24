# ¿Cuánto me toca?

Calculadoras laborales para México: aguinaldo, sueldo neto y finiquito/liquidación, con las tablas fiscales de 2026.

Es un sitio estático (solo HTML, CSS y JavaScript). No necesita base de datos ni compilación: se publica tal cual en Vercel, Netlify o GitHub Pages.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Portada. Destaca la calculadora de temporada según el mes. |
| `aguinaldo/index.html` | Calculadora de aguinaldo con ISR. |
| `sueldo-neto/index.html` | Calculadora de sueldo neto (ISR, subsidio e IMSS). |
| `finiquito/index.html` | Calculadora de finiquito y liquidación. |
| `acerca/` y `privacidad/` | Páginas que pide Google AdSense para aprobar el sitio. |
| `assets/app.js` | Todos los cálculos y las tablas fiscales. |
| `assets/estilos.css` | Estilos compartidos. |

## Mantenimiento anual

Cada año, al inicio, actualiza en `assets/app.js`:

- `TARIFA`: tarifa mensual de ISR (Anexo 8 de la Resolución Miscelánea Fiscal).
- `UMA`: valor diario de la UMA (INEGI, vigente desde el 1 de febrero).
- `SUBSIDIO` y `SUBSIDIO_TOPE`: subsidio para el empleo.
- `MINIMO`: salarios mínimos (CONASAMI).

Y cambia el año en los títulos de las páginas.

## Temporadas de la portada

En `assets/app.js`, el objeto `TEMPORADA` indica qué calculadora se destaca cada mes (1 = enero). Cuando existan las calculadoras de PTU y declaración anual, se asignan a mayo-junio y abril.

## Pendientes

- [ ] Correo de contacto en `acerca/` y `privacidad/`.
- [ ] Dominio propio y `sitemap.xml`.
- [ ] Código de Google AdSense en el `<head>` de cada página, y archivo `ads.txt`.
- [ ] Calculadoras de PTU y declaración anual.
