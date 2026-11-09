# Funciones pospuestas

Última actualización: 2026-11-08

Este documento evita que las ideas fuera del MVP se pierdan. Que una función
aparezca aquí no significa que esté prometida: significa que podrá evaluarse
después de validar el núcleo de edición.

| Función | Motivo para posponerla | Condición para reconsiderarla |
|---|---|---|
| Elección automática del perfil | El fotógrafo puede indicar el contexto con mayor precisión y sin esfuerzo relevante | Solo si en el futuro los fotógrafos consideran molesta la selección manual |
| Culling o selección de las mejores fotos | Requiere criterios y datos distintos de los usados para aprender edición | Edición estable y acceso a selecciones históricas del fotógrafo |
| Agrupamiento de ráfagas y duplicados | Es un subsistema de visión y flujo de revisión independiente | Culling priorizado en la hoja de ruta |
| Detección de desenfoque, ojos cerrados y problemas técnicos | Necesita evaluación específica y tolerancias configurables | Conjunto de prueba etiquetado por el fotógrafo. Implementado parcialmente: desenfoque y exposición (`quality.py`, umbrales sin calibrar); falta ojos cerrados |
| Recorte automático | Requiere comprender sujeto y composición; no surge de los sliders globales | Dataset y criterio de composición definidos |
| Enderezado y perspectiva | Es independiente del estilo global y puede tener reglas por género | Núcleo validado y casos reales reunidos |
| Máscara de sujeto o fondo | Requiere segmentación y escritura estable de máscaras compatibles con Lightroom | Prueba separada de compatibilidad y calidad |
| Suavizado de piel, dientes y retoque facial | Tiene alto riesgo de resultados artificiales y exige controles específicos | Retrato priorizado y aprobación visual del fotógrafo |
| Eliminación de objetos | Modifica contenido visual y excede una preedición basada en metadatos simples | Producto base estable y necesidad comercial comprobada |
| Reducción de ruido con IA | Puede requerir procesamiento de alta resolución y generar archivos derivados | Formatos, hardware y flujo de almacenamiento definidos |
| Tienda o intercambio de perfiles | El producto inicial es privado y para un único fotógrafo | Existencia de varios usuarios y acuerdos sobre propiedad de estilos |
| Varios fotógrafos y cuentas | Agrega usuarios, permisos, separación de datos y soporte | Decisión de convertirlo en producto comercial |
| Procesamiento en la nube | Contradice el objetivo local inicial y crea costos operativos | Necesidad de sincronización o hardware local insuficiente |
| Aplicación móvil o web | No aporta al flujo inicial de Lightroom Classic en Windows | Demanda de acceso remoto comprobada |
| Edición directa del catálogo `.lrcat` | Riesgo de bloqueo, corrupción y cambios internos de Lightroom | Investigación específica, backups y compatibilidad demostrada |
| Compatibilidad inicial con Capture One u otros editores | Multiplica formatos e integraciones | Lightroom estable y demanda concreta |
| Perfiles públicos inspirados en otros fotógrafos | Problemas de datos, derechos y mantenimiento | Datos propios autorizados y estrategia comercial definida |
| Sugerencias generativas o análisis mediante APIs externas | Introduce costo por uso y dependencia de terceros | Caso de uso donde el beneficio supere costo y privacidad |

## Ideas que sí pertenecen al núcleo, pero pueden entrar gradualmente

- Más de un perfil personalizado.
- Actualización del perfil con correcciones finales.
- Vista previa de una muestra antes de procesar toda la sesión.
- Advertencia de baja confianza o fotografía fuera de distribución.
- Historial y comparación de versiones de un perfil.
- Soporte progresivo de más controles globales de Lightroom.

Estas funciones no deben confundirse con extras comerciales: forman parte del
diseño del producto, aunque algunas se incorporen después de la primera prueba.
