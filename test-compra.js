// Script para testar compra
const http = require('http');

// Dados de teste - você precisa ajustar esses valores com IDs reais
const testData = {
  metodo_pagamento: 'pix',
  itens: [
    {
      produto_id: 1, // Ajuste com um ID de produto que existe
      quantidade: 1
    }
  ]
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/sales',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer seu_token_aqui' // Você precisa de um token válido
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== RESPOSTA ===');
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(`Erro: ${e.message}`);
});

console.log('Enviando requisição de compra...');
console.log('Dados:', JSON.stringify(testData, null, 2));
req.write(JSON.stringify(testData));
req.end();
