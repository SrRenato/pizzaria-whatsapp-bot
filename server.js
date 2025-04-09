import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import { config } from 'dotenv';

config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const MessagingResponse = twilio.twiml.MessagingResponse;

// Menu de Pizzas
const PIZZAS = {
  TRADICIONAIS: {
    1: { nome: "Brócolis e Bacon", precoGrande: 89.90, precoMedia: 68.90 },
    2: { nome: "Marguerita", precoGrande: 79.90, precoMedia: 67.90 },
    3: { nome: "Portuguesa", precoGrande: 89.90, precoMedia: 77.90 },
    4: { nome: "Muçarela", precoGrande: 79.90, precoMedia: 68.90 },
    5: { nome: "Frango com Catupiry", precoGrande: 89.90, precoMedia: 68.90 },
    6: { nome: "Quatro Queijos", precoGrande: 96.90, precoMedia: 76.90 },
    7: { nome: "Calabresa Paulistana", precoGrande: 79.90, precoMedia: 68.90 }
  },
  PREMIUM: {
    8: { nome: "À Moda da Casa", precoGrande: 123.90, precoMedia: 97.90 },
    9: { nome: "Filé Mignon e Gorgonzola", precoGrande: 123.90, precoMedia: 97.90 },
    10: { nome: "Parma", precoGrande: 114.90, precoMedia: 90.90 },
    11: { nome: "Pepperoni", precoGrande: 114.90, precoMedia: 90.90 }
  },
  DOCES: {
    12: { nome: "Forneria de Pistache", precoGrande: 123.90, precoMedia: 97.90 },
    13: { nome: "Chocolate com Morango", precoGrande: 97.90, precoMedia: 77.90 },
    14: { nome: "Romeu e Julieta", precoGrande: 79.90, precoMedia: 68.90 }
  }
};

const BORDAS = {
  1: { nome: "Catupiry", preco: 15.00 },
  2: { nome: "Cheddar", preco: 15.00 },
  3: { nome: "Chocolate", preco: 15.00 },
  4: { nome: "Sem Borda", preco: 0 }
};

const BEBIDAS = {
  1: { nome: "Água Sem Gás", preco: 6.50 },
  2: { nome: "Água Com Gás", preco: 7.00 },
  3: { nome: "Água Tônica Antarctica", preco: 9.00 },
  4: { nome: "Refrigerante Lata", preco: 9.00 },
  5: { nome: "Refrigerante 600ml", preco: 12.00 },
  6: { nome: "Suco Prat's Pequeno", preco: 14.50 },
  7: { nome: "Soda Italiana Maçã Verde", preco: 25.00 },
  8: { nome: "Soda Italiana Frutas Vermelhas", preco: 25.00 },
  9: { nome: "Sem bebida", preco: 0 }
};

// Armazenar estado da conversa
const conversationState = new Map();

const STEPS = {
  START: 'start',
  MENU: 'menu',
  CATEGORIA: 'categoria',
  TAMANHO: 'tamanho',
  PIZZA_TYPE: 'pizza_type',
  NAME: 'name',
  ADDRESS: 'address',
  FLAVOR: 'flavor',
  FLAVOR_TWO: 'flavor_two',
  BORDER: 'border',
  DRINK: 'drink',
  PAYMENT: 'payment',
  CHANGE: 'change',
  CONFIRMATION: 'confirmation',
  FEEDBACK: 'feedback',
  PROMOCOES: 'promocoes'
};

function formatarMenuPizzas(categoria) {
  let menu = `*🍕 PIZZAS ${categoria} 🍕*\n\n`;
  const pizzas = PIZZAS[categoria];
  
  for (const [id, pizza] of Object.entries(pizzas)) {
    menu += `[${id}] ${pizza.nome}\n`;
    menu += `Grande: R$ ${pizza.precoGrande.toFixed(2)} | `;
    menu += `Média: R$ ${pizza.precoMedia.toFixed(2)}\n\n`;
  }
  
  menu += "👉 Digite o número da pizza desejada\n";
  menu += "📝 Digite MENU para voltar ao início";
  return menu;
}

function formatarMenuBordas() {
  let menu = "*🧀 BORDAS RECHEADAS 🧀*\n\n";
  for (const [id, borda] of Object.entries(BORDAS)) {
    menu += `[${id}] ${borda.nome}`;
    if (borda.preco > 0) {
      menu += ` - R$ ${borda.preco.toFixed(2)}`;
    }
    menu += "\n";
  }
  menu += "\n👉 Digite o número da borda desejada\n";
  menu += "📝 Digite MENU para voltar ao início";
  return menu;
}

function formatarMenuBebidas() {
  let menu = "*🥤 BEBIDAS 🥤*\n\n";
  for (const [id, bebida] of Object.entries(BEBIDAS)) {
    menu += `[${id}] ${bebida.nome}`;
    if (bebida.preco > 0) {
      menu += ` - R$ ${bebida.preco.toFixed(2)}`;
    }
    menu += "\n";
  }
  menu += "\n👉 Digite o número da bebida desejada\n";
  menu += "📝 Digite MENU para voltar ao início";
  return menu;
}

function getMainMenu() {
  return `*🍕 BEM-VINDO À PIZZARIA DELÍCIA 🍕*

Escolha uma opção:

1️⃣ Fazer Pedido
2️⃣ Ver Cardápio
3️⃣ Horário de Funcionamento
4️⃣ Falar com Atendente
5️⃣ Promoções do Dia
6️⃣ Sugestões e Reclamações

👉 Digite o número da opção desejada`;
}

function getHorarioFuncionamento() {
  return `*⏰ HORÁRIO DE FUNCIONAMENTO ⏰*

🗓️ Segunda a Quinta: 18h às 23h
🗓️ Sexta a Domingo: 18h às 00h
🗓️ Feriados: 18h às 00h

💫 Aceitamos pedidos até 30 minutos antes do fechamento
🛵 Tempo médio de entrega: 30-45 minutos

👉 Digite MENU para voltar ao menu principal`;
}

function getPromocoes() {
  return `*🎉 PROMOÇÕES DO DIA 🎉*

1️⃣ SEGUNDA E TERÇA:
   Pizza Grande + Refri 2L = R$ 89,90

2️⃣ QUARTA-FEIRA:
   Pizza Grande de Margherita por R$ 59,90

3️⃣ QUINTA-FEIRA:
   Na compra de uma pizza grande, ganhe uma borda recheada

4️⃣ SEXTA A DOMINGO:
   10% OFF em pedidos acima de R$ 150

👉 Digite MENU para voltar ao menu principal`;
}

app.post('/webhook', (req, res) => {
  console.log('Mensagem recebida:', req.body);
  
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body.trim().toUpperCase();
  const sender = req.body.From;

  let currentState = conversationState.get(sender) || { step: STEPS.START };

  // Permitir voltar ao menu principal de qualquer etapa
  if (incomingMsg === 'MENU') {
    twiml.message(getMainMenu());
    currentState.step = STEPS.MENU;
    conversationState.set(sender, currentState);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  try {
    switch (currentState.step) {
      case STEPS.START:
        if (incomingMsg === 'INICIAR' || incomingMsg === 'MENU' || incomingMsg === 'VOLTAR') {
          twiml.message(getMainMenu());
          currentState.step = STEPS.MENU;
        } else {
          twiml.message('👋 Olá! Digite INICIAR para começar seu atendimento ou MENU para ver as opções.');
        }
        break;

      case STEPS.MENU:
        switch(incomingMsg) {
          case '1': // Fazer Pedido
            const mensagem = "*📋 CATEGORIAS DE PIZZAS 📋*\n\n" +
                           "1️⃣ Pizzas Tradicionais\n" +
                           "2️⃣ Pizzas Premium\n" +
                           "3️⃣ Pizzas Doces\n\n" +
                           "👉 Digite o número da categoria\n" +
                           "📝 Digite MENU para voltar ao início";
            twiml.message(mensagem);
            currentState.step = STEPS.CATEGORIA;
            break;
          case '2': // Ver Cardápio
            let cardapio = "*📜 CARDÁPIO COMPLETO 📜*\n\n";
            cardapio += "Acesse nosso cardápio digital:\n";
            cardapio += "🔗 www.pizzariadelicia.com.br/cardapio\n\n";
            cardapio += "👉 Digite MENU para voltar ao menu principal";
            twiml.message(cardapio);
            break;
          case '3': // Horário de Funcionamento
            twiml.message(getHorarioFuncionamento());
            break;
          case '4': // Falar com Atendente
            twiml.message("🤝 Em breve um atendente entrará em contato.\n\n⏱️ Tempo médio de espera: 5 minutos\n\n👉 Digite MENU para voltar ao menu principal");
            break;
          case '5': // Promoções
            twiml.message(getPromocoes());
            break;
          case '6': // Sugestões e Reclamações
            twiml.message("📢 *SUGESTÕES E RECLAMAÇÕES* 📢\n\n" +
                         "Queremos sempre melhorar!\n\n" +
                         "📧 Email: sac@pizzariadelicia.com.br\n" +
                         "📞 Tel: (11) 9999-9999\n\n" +
                         "👉 Digite MENU para voltar ao início");
            break;
          default:
            twiml.message("❌ Opção inválida. Por favor, escolha uma opção válida do menu principal.");
            break;
        }
        break;

      case STEPS.CATEGORIA:
        const categorias = {
          '1': 'TRADICIONAIS',
          '2': 'PREMIUM',
          '3': 'DOCES'
        };
        
        if (Object.keys(categorias).includes(incomingMsg)) {
          currentState.categoria = categorias[incomingMsg];
          twiml.message("*📏 ESCOLHA O TAMANHO 📏*\n\n1️⃣ Média\n2️⃣ Grande\n\n👉 Digite 1 ou 2\n📝 Digite MENU para voltar ao início");
          currentState.step = STEPS.TAMANHO;
        } else {
          twiml.message('❌ Por favor, escolha uma categoria válida (1, 2 ou 3).\n📝 Digite MENU para voltar ao início');
        }
        break;

      case STEPS.TAMANHO:
        if (['1', '2'].includes(incomingMsg)) {
          currentState.tamanho = incomingMsg === '1' ? 'MEDIA' : 'GRANDE';
          twiml.message(formatarMenuPizzas(currentState.categoria));
          currentState.step = STEPS.FLAVOR;
        } else {
          twiml.message('❌ Por favor, escolha um tamanho válido (1 ou 2).\n📝 Digite MENU para voltar ao início');
        }
        break;

      case STEPS.FLAVOR:
        const pizzasSelecionadas = PIZZAS[currentState.categoria];
        if (pizzasSelecionadas[incomingMsg]) {
          currentState.sabor = pizzasSelecionadas[incomingMsg].nome;
          currentState.preco = currentState.tamanho === 'GRANDE' 
            ? pizzasSelecionadas[incomingMsg].precoGrande 
            : pizzasSelecionadas[incomingMsg].precoMedia;
          
          twiml.message(formatarMenuBordas());
          currentState.step = STEPS.BORDER;
        } else {
          twiml.message('❌ Opção inválida. Por favor, escolha um número válido do menu.\n📝 Digite MENU para voltar ao início');
        }
        break;

      case STEPS.BORDER:
        if (BORDAS[incomingMsg]) {
          currentState.borda = BORDAS[incomingMsg].nome;
          currentState.precoBorda = BORDAS[incomingMsg].preco;
          twiml.message(formatarMenuBebidas());
          currentState.step = STEPS.DRINK;
        } else {
          twiml.message('❌ Opção de borda inválida. Por favor, escolha uma opção válida.\n📝 Digite MENU para voltar ao início');
        }
        break;

      case STEPS.DRINK:
        if (BEBIDAS[incomingMsg]) {
          currentState.bebida = BEBIDAS[incomingMsg].nome;
          currentState.precoBebida = BEBIDAS[incomingMsg].preco;
          twiml.message('📝 Digite seu nome:\n\n📝 Digite MENU para voltar ao início');
          currentState.step = STEPS.NAME;
        } else {
          twiml.message('❌ Opção de bebida inválida. Por favor, escolha uma opção válida.\n📝 Digite MENU para voltar ao início');
        }
        break;

      case STEPS.NAME:
        currentState.nome = incomingMsg;
        twiml.message('📍 Digite seu endereço completo:\n(Rua, número, complemento, bairro)\n\n📝 Digite MENU para voltar ao início');
        currentState.step = STEPS.ADDRESS;
        break;

      case STEPS.ADDRESS:
        currentState.endereco = incomingMsg;
        twiml.message('💳 Forma de Pagamento:\n\n1️⃣ Dinheiro\n2️⃣ Cartão (Débito/Crédito)\n3️⃣ PIX\n\n👉 Digite o número da opção\n📝 Digite MENU para voltar ao início');
        currentState.step = STEPS.PAYMENT;
        break;

      case STEPS.PAYMENT:
        if (['1', '2', '3'].includes(incomingMsg)) {
          currentState.pagamento = ['Dinheiro', 'Cartão', 'PIX'][parseInt(incomingMsg) - 1];
          if (incomingMsg === '1') {
            twiml.message('💵 Digite o valor para troco (ou 0 se não precisa):\n\n📝 Digite MENU para voltar ao início');
            currentState.step = STEPS.CHANGE;
          } else if (incomingMsg === '3') {
            twiml.message('📱 Nossa chave PIX: pizzaria@email.com\n\nEnvie o comprovante após a confirmação do pedido.');
            const total = currentState.preco + currentState.precoBorda + currentState.precoBebida;
            let resumo = gerarResumoPedido(currentState, total);
            twiml.message(resumo);
            currentState.step = STEPS.CONFIRMATION;
          } else {
            const total = currentState.preco + currentState.precoBorda + currentState.precoBebida;
            let resumo = gerarResumoPedido(currentState, total);
            twiml.message(resumo);
            currentState.step = STEPS.CONFIRMATION;
          }
        } else {
          twiml.message('❌ Opção inválida. Digite 1 para Dinheiro, 2 para Cartão ou 3 para PIX.\n📝 Digite MENU para voltar ao início');
        }
        break;

      case STEPS.CHANGE:
        currentState.troco = parseFloat(incomingMsg);
        const total = currentState.preco + currentState.precoBorda + currentState.precoBebida;
        let resumo = gerarResumoPedido(currentState, total);
        twiml.message(resumo);
        currentState.step = STEPS.CONFIRMATION;
        break;

      case STEPS.CONFIRMATION:
        if (incomingMsg === 'FECHAR') {
          const numeroPedido = Math.floor(Math.random() * 10000);
          const mensagemConfirmacao = `✅ *PEDIDO CONFIRMADO!*

🎫 Número do pedido: #${numeroPedido}
⏱️ Tempo estimado: 30-45 minutos
🛵 Status: Em preparo

🎁 Ganhe 10% OFF na próxima compra!
Código: PIZZA${numeroPedido}

🙏 Agradecemos a preferência!`;
          twiml.message(mensagemConfirmacao);
          conversationState.delete(sender);
        } else if (incomingMsg === 'CANCELAR') {
          twiml.message('❌ Pedido cancelado.\n\nDigite MENU para fazer um novo pedido.');
          conversationState.delete(sender);
        } else {
          twiml.message('❌ Opção inválida.\nDigite FECHAR para confirmar ou CANCELAR para encerrar.\n📝 Digite MENU para voltar ao início');
        }
        break;

      default:
        twiml.message('⚠️ Ocorreu um erro. Digite INICIAR para recomeçar ou MENU para ver as opções.');
        conversationState.delete(sender);
    }

    conversationState.set(sender, currentState);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  } catch (error) {
    console.error('Error:', error);
    twiml.message('⚠️ Desculpe, ocorreu um erro. Digite INICIAR para recomeçar ou MENU para ver as opções.');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }
});

function gerarResumoPedido(currentState, total) {
  let resumo = `*📋 RESUMO DO PEDIDO 📋*\n\n`;
  resumo += `👤 Nome: ${currentState.nome}\n`;
  resumo += `📍 Endereço: ${currentState.endereco}\n\n`;
  resumo += `🍕 Pizza: ${currentState.sabor} (${currentState.tamanho})\n`;
  resumo += `🧀 Borda: ${currentState.borda}\n`;
  resumo += `🥤 Bebida: ${currentState.bebida}\n`;
  resumo += `💳 Pagamento: ${currentState.pagamento}\n`;
  if (currentState.troco > 0) {
    resumo += `💵 Troco para: R$ ${currentState.troco.toFixed(2)}\n`;
  }
  resumo += `\n💰 Total: R$ ${total.toFixed(2)}\n\n`;
  resumo += `👉 Digite FECHAR para confirmar ou CANCELAR para encerrar.\n`;
  resumo += `📝 Digite MENU para voltar ao início`;
  return resumo;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});