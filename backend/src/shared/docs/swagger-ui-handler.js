const openApiSpec = require('./openapi-spec');

function renderSwaggerUiHtml(specUrl = '/api/docs/openapi.json') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sinergia Urbana Costa Rica - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar {
      display: none;
    }
    .swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #ffffff;
      border-radius: 12px;
      margin-top: 20px;
      margin-bottom: 40px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .hero-banner {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #38bdf8;
      padding: 24px;
      text-align: center;
      border-bottom: 2px solid #38bdf8;
    }
    .hero-banner h1 {
      margin: 0 0 8px 0;
      font-size: 1.8rem;
    }
    .hero-banner p {
      margin: 0;
      color: #94a3b8;
      font-size: 0.95rem;
    }
    .badge-ai {
      display: inline-block;
      background-color: #0284c7;
      color: white;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="hero-banner">
    <h1>🇨🇷 Sinergia Urbana Costa Rica — Documentación de API</h1>
    <p>Endpoints REST, Conectores Abiertos y Copiloto Inteligente</p>
    <div class="badge-ai">Potenciado por DeepSeek AI</div>
  </div>
  <div id="swagger-ui" class="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "${specUrl}",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

module.exports = {
  openApiSpec,
  renderSwaggerUiHtml
};

