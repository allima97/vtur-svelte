#!/usr/bin/env node
/**
 * Script para verificar se as variáveis do Supabase estão configuradas
 * Execute: node check-env.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('🔍 Verificando configuração do Supabase...\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ Arquivo .env não encontrado!');
  console.log('\n👉 Crie um arquivo .env na raiz do projeto com:');
  console.log('PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Extrair variáveis
const urlMatch = envContent.match(/PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

console.log('📋 Status das variáveis:\n');

if (!url) {
  console.log('❌ PUBLIC_SUPABASE_URL: NÃO CONFIGURADA');
} else if (url.includes('seu-projeto') || url.includes('placeholder')) {
  console.log('⚠️  PUBLIC_SUPABASE_URL: Valor de exemplo detectado');
  console.log(`   Valor: ${url}`);
} else {
  console.log('✅ PUBLIC_SUPABASE_URL: OK');
  console.log(`   Valor: ${url.substring(0, 40)}...`);
}

if (!key) {
  console.log('❌ PUBLIC_SUPABASE_ANON_KEY: NÃO CONFIGURADA');
} else if (key.includes('sua-anon-key') || key.includes('placeholder')) {
  console.log('⚠️  PUBLIC_SUPABASE_ANON_KEY: Valor de exemplo detectado');
} else {
  console.log('✅ PUBLIC_SUPABASE_ANON_KEY: OK');
  console.log(`   Valor: ${key.substring(0, 30)}...`);
}

console.log('\n' + '='.repeat(50));

if ((!url || url.includes('seu-projeto')) || (!key || key.includes('sua-anon-key'))) {
  console.log('\n⚠️  ATENÇÃO: Variáveis não configuradas corretamente!');
  console.log('\n👉 Para corrigir:');
  console.log('   1. Edite o arquivo .env na raiz do projeto');
  console.log('   2. Substitua os valores pelos do seu projeto Supabase');
  console.log('   3. PARE o servidor (Ctrl+C)');
  console.log('   4. Inicie novamente: npm run dev');
  process.exit(1);
} else {
  console.log('\n✅ Variáveis configuradas corretamente!');
  console.log('\n👉 Para aplicar as alterações:');
  console.log('   1. PARE o servidor (Ctrl+C) se estiver rodando');
  console.log('   2. Inicie novamente: npm run dev');
  console.log('\n💡 Dica: O Vite não recarrega o .env automaticamente!');
}
