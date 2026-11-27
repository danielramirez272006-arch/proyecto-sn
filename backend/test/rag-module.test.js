process.env.NODE_ENV = 'test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../src/shared/config/database');
const ragService = require('../src/modules/rag/rag-service');

describe('Motor RAG Híbrido Synodos (Conocimiento + Catálogo)', () => {
  it('siembra base curada de Costa Rica y recupera documentos relevantes sin importar tildes', async () => {
    await initDatabase();
    const docs = await ragService.listDocuments();
    assert.ok(docs.length >= 6, `Se esperaban >= 6 documentos curados, llegaron ${docs.length}`);

    const res = await ragService.retrieveContext('mi perro comio chocolate y uvas que hago emergencia');
    assert.ok(res.documents.length >= 1, 'Debe recuperar guías de tóxicos/emergencias');
    assert.match(res.promptBlock, /chocolate|emergencia|UNA/i);
  });

  it('permite crear, consultar y eliminar documentos personalizados en el RAG', async () => {
    await initDatabase();
    const created = await ragService.upsertDocument({
      title: 'Guía de Parques Caninos en Curridabat',
      category: 'parques',
      tags: 'curridabat,parque,perros,agua',
      content: 'El Parque Freses en Curridabat cuenta con áreas verdes sombreadas, bebederos y zonas amplias para pasear con perros con correa.',
    });
    assert.ok(created.id);

    const drafts = await ragService.searchDocuments('parque freses curridabat bebederos');
    assert.ok(!drafts.some((doc) => doc.id === created.id));
    assert.ok((await ragService.listDocuments()).some((doc) => doc.id === created.id && doc.is_active === 0));

    await ragService.upsertDocument({
      id: created.id,
      title: created.title,
      content: 'Guía pública sobre el Parque Freses de Curridabat y sus bebederos.',
      published: true,
    });
    const found = await ragService.searchDocuments('parque freses curridabat bebederos', { limit: 3 });
    assert.ok(found.some((d) => d.id === created.id), 'Debe encontrar el documento recién indexado');

    const del = await ragService.deleteDocument(created.id);
    assert.equal(del.deleted, true);
  });

  it('encuentra el fragmento relevante sin premiar repeticiones ni coincidencias dentro de otra palabra', async () => {
    await initDatabase();
    const relevant = await ragService.upsertDocument({
      title: 'Consulta de servicios',
      content: 'Material general. '.repeat(44) + '\n\nLas citas en la clínica se atienden por orden de llegada.',
      published: true,
    });
    const unrelated = await ragService.upsertDocument({
      title: 'Clínicamente',
      content: 'Información sobre una investigación clínicamente documentada.',
      published: true,
    });

    try {
      const results = await ragService.searchDocuments('clínica cita cita');
      const match = results.find((doc) => doc.id === relevant.id);
      assert.ok(match);
      assert.match(match.excerpt, /Las citas en la clínica/);
      assert.ok(!results.some((doc) => doc.id === unrelated.id));
      const once = await ragService.searchDocuments('clínica cita');
      assert.equal(match.score, once.find((doc) => doc.id === relevant.id).score);
    } finally {
      await ragService.deleteDocument(relevant.id);
      await ragService.deleteDocument(unrelated.id);
    }
  });

  it('distingue acceso confirmado, especie excluida y política vencida en el contexto', async (t) => {
    await initDatabase();
    const repository = require('../src/modules/places/places-repository');
    const place = (id, permitted, expiresAt) => ({
      id,
      name: 'Cafetería ' + id,
      district: 'Escazú',
      verified_by_admin: true,
      attributes_metadata: {
        pet_policy: {
          access_status: 'allowed',
          source_type: 'admin_review',
          species_allowed: permitted,
          seating_access: 'outdoor',
          expires_at: expiresAt,
        },
      },
    });
    t.mock.method(repository, 'findAll', async () => [
      place('Vencida', ['dog'], '2020-01-01'),
      place('Solo gatos', ['cat']),
      place('Perros', ['dog']),
    ]);

    const result = await ragService.retrieveContext('¿Cafetería en Escazú para ir con mi perro?');
    assert.equal(result.places[0].id, 'Perros');
    assert.equal(result.places.find((p) => p.id === 'Solo gatos').pet_access, 'species_not_allowed');
    assert.equal(result.places.find((p) => p.id === 'Vencida').pet_access, 'unknown');
    assert.ok(result.promptBlock.includes('admisión confirmada según el catálogo (exterior)'));
  });

});
