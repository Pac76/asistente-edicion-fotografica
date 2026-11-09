# Registro de decisiones

Este archivo registra decisiones confirmadas, supuestos y cambios de alcance.

| Fecha | Estado | Decisión | Motivo |
|---|---|---|---|
| 2026-07-29 | Confirmada | La primera plataforma será Windows | Es el entorno del fotógrafo objetivo |
| 2026-07-29 | Confirmada | El producto tendrá interfaz visual y no requerirá comandos | El fotógrafo objetivo no es un usuario técnico |
| 2026-07-29 | Confirmada | El procesamiento inicial será local | Privacidad y ausencia de costo por API |
| 2026-07-29 | Confirmada | Los perfiles personalizados son parte central del producto | Es la necesidad central del producto |
| 2026-07-29 | Confirmada | El fotógrafo indicará manualmente el perfil/contexto de cada sesión | Es sencillo para el usuario y aporta al motor información confiable |
| 2026-07-29 | Confirmada | El sistema no intentará deducir automáticamente el contexto en la V1 | No aporta valor suficiente frente a la selección explícita |
| 2026-07-29 | Confirmada | Antes de reunir los datos de prueba se prepararán el flujo funcional, la auditoría y el protocolo de prueba | Permite avanzar sin implementar sobre supuestos |
| 2026-07-29 | Confirmada | Se puede implementar código durante la definición y antes de reunir el material de prueba | No hay motivo técnico para esperar el material antes de construir las herramientas |
| 2026-07-29 | Provisional | La auditoría de recepción se implementa como componente independiente en Node.js | Está disponible en el entorno y no condiciona el motor de aprendizaje |
| 2026-07-29 | Provisional | El motor de aprendizaje se mantendrá desacoplado y probablemente utilizará Python | El ecosistema de fotografía RAW y aprendizaje automático deberá evaluarse con los datos reales |
| 2026-07-29 | Confirmada | Python se administrará con uv y un entorno aislado reproducible | Evita contaminar la PC nueva y permite fijar versiones |
| 2026-07-29 | Confirmada | El proyecto utilizará Python 3.12 inicialmente | Tiene amplio soporte de librerías fotográficas y de aprendizaje |
| 2026-07-29 | Confirmada | No se instalarán CUDA ni toolkits GPU en la PC de desarrollo actual | Solo dispone de gráficos AMD integrados |
| 2026-07-29 | Pospuesta | PyTorch no entra en el entorno base | Se incorporará únicamente si las pruebas justifican un modelo profundo |
| 2026-07-29 | Confirmada | Los RAW no se modificarán | Seguridad y flujo no destructivo |
| 2026-07-29 | Provisional | La integración inicial será mediante XMP | Es más controlable que escribir directamente en `.lrcat` |
| 2026-07-29 | Provisional | Se validarán uno o dos perfiles antes de construir todos | Permite medir viabilidad con menor costo y riesgo |
| 2026-07-29 | Provisional | Se comenzará con ajustes globales | Son el núcleo del perfil de edición y evitan subsistemas de máscaras o retoque |
| 2026-07-29 | Pospuesta | La elección automática de perfil no estará en la primera versión | Primero debe funcionar cada perfil por separado |
| 2026-07-29 | Pospuesta | Culling, máscaras, recorte, retoque y reducción de ruido quedan fuera del MVP inicial | Son problemas técnicos independientes |
| 2026-11-08 | Confirmada | El desarrollo y las pruebas usarán fotografías y XMP propios, sin personas identificables ni coordenadas GPS | Evita datos personales de terceros en el repositorio y en las sesiones de trabajo |
| 2026-11-08 | Confirmada | El material de prueba se guarda fuera del repositorio o en `datos-usuarios/`, que está ignorada | Las fotografías no deben versionarse |
| 2026-11-08 | Provisional | Se adelanta una parte mínima de la selección: métricas de calidad técnica por foto (desenfoque y exposición) con umbrales configurables | Se puede medir sin modelos de aprendizaje; los umbrales dependen del estilo y deben calibrarse con fotografías etiquetadas |

## Estados

- **Confirmada:** acordada y solo cambia con una decisión explícita.
- **Provisional:** hipótesis de trabajo pendiente de evidencia.
- **Pospuesta:** fuera del alcance actual y registrada en el backlog.
- **Descartada:** evaluada y deliberadamente excluida.
