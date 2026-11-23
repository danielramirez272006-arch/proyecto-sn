# Automatizaciones de GoToX Pet OS

Los tres JSON de `workflows/` se importan desde **Import from File** en n8n. Cada flujo incluye ejecución manual y horario de Costa Rica.

| Flujo | Disparador | Pasos y propósito |
| --- | --- | --- |
| 01 · Políticas de mascotas | Diario, 08:00 | El backend revisa vencimientos, contradicciones y políticas pendientes. Registra eventos para revisión administrativa. |
| 02 · Boletín GAM | Diario, 07:00 | n8n llama al agente de boletín. El agente prepara el resumen con los datos de clima y operación que obtiene el backend. |
| 03 · Auditoría y despacho | Cada 15 minutos | Valida la cadena de auditoría. Si la API devuelve `valid: true`, procesa hasta diez notificaciones pendientes por ciclo. Si falla la verificación, n8n marca la ejecución como fallida. |

## Conexión y prueba

1. Sustituye `https://backend.example.invalid` en los nodos HTTP por la URL base del backend. En producción usa la URL HTTPS accesible desde n8n.
2. Crea una credencial **Header Auth** con nombre de cabecera `Authorization` y valor `Bearer <token administrativo vigente>`. Selecciónala en todos los nodos HTTP. Los archivos JSON se distribuyen sin valores de credenciales.
3. Ejecuta manualmente contra un backend de pruebas. Para el flujo 01 confirma el resultado del escaneo. Para el 02 confirma el resultado del agente y verifica que el programador interno no dispare el mismo trabajo en paralelo. Para el 03 usa una cola de pruebas con un único destinatario controlado y comprueba el envío real y el estado en el backend. También comprueba que una respuesta `valid: false` detenga el despacho.
4. Publica los flujos cuando pasen estas pruebas. Si el token vence, actualiza la credencial antes de depender del horario. Para producción conviene disponer de autenticación de servicio con permisos limitados a estas rutas.

El flujo 03 despacha correos que el backend ya puso en cola y depende de que esté configurado el proveedor de correo del backend. La confirmación de cambios por parte del cliente sigue siendo una función aparte. La auditoría verifica la integridad de la cadena y no ejecuta bajas de cuenta.

Se importaron los tres archivos en n8n 2.38.6 con un perfil local aislado. Falta la prueba de extremo a extremo con el backend y el proveedor de correo.
