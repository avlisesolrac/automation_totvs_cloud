require('dotenv').config();
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const Chart = require('chart.js');
const QuickChart = require('quickchart-js');

//PREENCHA O ARQUIVO .env COM SEUS DADOS DE ACESSO AO ZENDESK,
//OS DADOS SERÃO USADOS PARA ACESSAR O ZENDESK E ENVIAR O EMAIL SOBRE OS TICKETS
const yourEmail = process.env.EMAIL;
const yourPassword = process.env.SENHA;
const yourName = process.env.NOME;

//Lista Atualizada até 17/03/2022 às 11:20, com 45 agentes de 0 a 44
const agentes = {
  agente: ["Administrador Portal", "Adriano da Silva Santana", "Alessandro dos Santos Macedo", "Anderson Augusto Ferreira", "Anderson Felipe", "Beatriz Cruz", "Bianca Zanella Abrunhosa", "Carlos Duarte", "CARLOS EDUARDO SILVA", "Carlos Rogério das Dores", "DENNIS TERENTJVAS", "Diego Rodrigues Aureliano", "Eduardo Begido de Oliveira", "Eliel Oliveira", "Felipe Henrique Arruda", "Felipe Vieira Mororo", "Gabriella Lopes", "Gustavo Mesko", "Henrique Alves dos Santos", "Jessica Anjos", "Iago Graciano", "ICARO AGILI CARDOSO", "JANUS JOSE JUNIOR", "Joao Carlos Nascimento", "Jonnathan Oliveira dos Santos", "José Rodrigues do Nascimento Neto", "Larissa Ionafa", "Leandro Ferreira Alcantara", "LEONARDO ANTONIO DOS SANTOS LOPES", "Leonardo Santos Felix", "Lucas Donatelli Cardona", "Marcelo Santos Silva", "Marco Pessolato", "Michel Nascimento", "Miguel Vieira", "Nilson Araujo Botelho", "Otavio Duarte Pinheiro", "Ricardo Castilho Pereira", "Rogerio do Santos Mazuqui", "Rosana Cristina Silva", "ROSANGELA VIEIRA COSTA", "Thiago Cruz Sampaio", "Thiago Henrique Arroyo", "Vagner Valle", "Vanessa Miguel"],
  ticketsAbertosDoAgente: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ticketsEsperaDoAgente: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

let listaWhats = [];
let listaAgentesComTickets = [];
let listaAgentesComTicketsAbertos = [];
let listaAgentesComTicketsEspera =  [];
let slaViolado = 0;
let ticketsNaoAlocados = 0;

console.log("Bem vindo ao Diário de Bordo | TOTVS Cloud | Coletando os Tickets Abertos e em Espera");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 950, height: 600 });
  const agtCloudProtheusStdTotal = 'https://totvssuporte.zendesk.com/agent/filters/360083846212';
  var messageContent;
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var yyyy = today.getFullYear();
  var hora = today.getHours();
  var saudacao;

  if (hora >= 0 && hora < 12){
    saudacao = "Bom dia!";
  }else{
    if(hora >= 12 && hora < 18){
      saudacao = "Boa Tarde!";
    }else{
      if(hora >= 18 && hora <= 23){
        saudacao = "Boa noite!";
      }
    }
  }

  if(hora == 5) hora = 6;

  await page.goto(agtCloudProtheusStdTotal, { waitUntil: 'networkidle2', timeout: 0 });

  console.log("Acessando a página do Zendesk");

  console.log("Logando na página");

  await page.waitForSelector('input#emailAddress');
  await page.type('input#emailAddress', `${yourEmail}`, {delay:50});
  await page.waitForSelector('[name="password"]');
  await page.type('[name="password"]', `${yourPassword}`, {delay:50});

  await page.keyboard.press('Enter')

  console.log("Login efetuado com sucesso");

  console.log("Carregando a página de tickets abertos");

  //<<<------AQUI COMEÇA A VERIFICAÇÃO DOS CHAMADOS ABERTOS ------>>>>

  await page.waitForSelector('[href="/agent/filters/1500053143362"]');

  await page.click('[href="/agent/filters/1500053143362"]');

  await demoraTimeout();

  //Retorna o número de páginas que tem na fila
  var numPages = await page.evaluate(() => {
    return document.querySelectorAll('tfoot>tr>td>div>ul>li').length;
  });

  numPages -=2;

  console.log("Total de Páginas Abertos: " +(numPages-2));

  //Varre as páginas de tickets a partir da primeira até a última página
  for(var i = 3; i<= numPages; i++){
    //Se for a primeira página não vai clicar em nada, já vai estar com a primeira página carregada, caso contrário irá clicar no menu da página seguinte, 2, 3, 4 e etc...
    if(i !== 3){
      console.log(`Clicando na pagina ${(i-2)}`);
      await page.click(`tfoot>tr>td>div>ul>li:nth-child(${i})`);
      await demora();
    }

    await page.waitForSelector('table > tbody > tr > td:nth-child(6)');

    console.log(`Acessado a fila de chamados da pagina ${(i-2)}`);
    
    //Retorna o nome do analista que está atribuído no chamado.
    atribuidosAbertos= await page.$$eval(`table > tbody > tr > td:nth-child(6)`, (options) => options.map (
      (option) => `${option.innerText}`,
    ));

    let slaViolados= await page.$$eval(`table > tbody > tr > td:nth-child(9)`, (options) => options.map (
      (option) => `${option.innerText}`,
    ));

    //Identifica se o nome do analista que está cadastrado no objeto Global agentes.agente está presente no objeto que foi retornado no método anterior e adiciona +1 no objeto agentes.ticketsAbertosDoAgente do respectivo agente.
    for (const indice in atribuidosAbertos){
      for(var ind=0; ind<=agentes.agente.length; ind++) {
        if(atribuidosAbertos[indice].indexOf(agentes.agente[ind]) > -1){
          //console.log(indice + " : " + atribuidosAbertos[indice]);
          agentes.ticketsAbertosDoAgente[ind]+=1;
        }
      }
      //Aqui retorna os não alocados, mas precisa alinhar com o coordenador, pois o filtro atual do backlog não está incluindo a fila do TAF/TSS
      if(atribuidosAbertos[indice].indexOf('-') > -1){
        //console.log(indice + " : " + atribuidosAbertos[indice]);
        ticketsNaoAlocados+=1;
      }
    };
      //método push adiciona todos as ocorrencias do agente na fila de tickets abertos
      //dados.push(atribuidosAbertos);
      for (const indiceSLA in slaViolados){
        if(slaViolados[indiceSLA].indexOf("-") > -1){
          //console.log(indiceSLA + " : " + slaViolados[indiceSLA]);
          slaViolado+=1;
        }
      };
  }

//<<<------AQUI COMEÇA A VERIFICAÇÃO DOS CHAMADOS EM ESPERA------>>>>

  console.log("\nAcessando a página de tickets em ESPERA");

  await page.waitForSelector('[href="/agent/filters/360083846332"]');

  await page.click('[href="/agent/filters/360083846332"]');

  await demoraTimeout();

  await page.waitForSelector('table > tbody > tr > td:nth-child(9)');

  console.log("Acessado a página de tickets em ESPERA");

  //Retorna o número de páginas que tem na fila em espera
  var numPagesEspera = await page.evaluate(() => {
    return document.querySelectorAll('tfoot>tr>td>div>ul>li').length;
  });

  numPagesEspera -=2;

  console.log("Total de Páginas em Espera: " +(numPagesEspera-2));

  //Varre as páginas de tickets a partir da primeira até a última página
  for(var iEspera = 3; iEspera<= numPagesEspera; iEspera++){
    //Se for a primeira página não vai clicar em nada, já vai estar com a primeira página carregada, caso contrário irá clicar no menu da página seguinte, 2, 3, 4 e etc...
    if(iEspera !== 3){
      console.log(`Clicando na pagina ${(iEspera-2)}`);
      await page.click(`tfoot>tr>td>div>ul>li:nth-child(${iEspera})`);
      await demora();
    }

    await page.waitForSelector('table > tbody > tr > td:nth-child(9)');

    console.log(`Acessado a fila de chamados da pagina ${(iEspera-2)}`);
    
    //Retorna o nome do analista que está atribuído no chamado.
    atribuidosEspera = await page.$$eval(`table > tbody > tr > td:nth-child(9)`, (options) => options.map (
      (option) => `${option.innerText}`,
    ));

    //Identifica se o nome do analista que está cadastrado no objeto Global agentes.agente está presente no objeto que foi retornado no método anterior e adiciona +1 no objeto agentes.ticketsEsperaDoAgente do respectivo agente.
    for (const indice in atribuidosEspera){
      for(var indEspera=0; indEspera<=agentes.agente.length; indEspera++) {
        if(atribuidosEspera[indice].indexOf(agentes.agente[indEspera]) > -1){
          //console.log(indice + " : " + atribuidosEspera[indice]);
          agentes.ticketsEsperaDoAgente[indEspera]+=1;
        }
      }
    };

  }
//<<<------AQUI TERMINA A VERIFICAÇÃO DOS CHAMADOS EM ESPERA------>>>>

for(i=0; i<agentes.agente.length;i++){
  if(agentes.ticketsAbertosDoAgente[i] !== 0 || agentes.ticketsEsperaDoAgente[i] !== 0 ){
    console.log(`[${agentes.agente[i]}]\nTickets Abertos: ${agentes.ticketsAbertosDoAgente[i]} | Tickets em Espera: ${agentes.ticketsEsperaDoAgente[i]}\n`);
    listaWhats.push(`*${agentes.agente[i]}*<br>Tickets Abertos: ${agentes.ticketsAbertosDoAgente[i]} | Tickets em Espera: ${agentes.ticketsEsperaDoAgente[i]}<br><br>`);
    listaAgentesComTickets.push(`"${agentes.agente[i]}"`);
    listaAgentesComTicketsAbertos.push(agentes.ticketsAbertosDoAgente[i]);
    listaAgentesComTicketsEspera.push(agentes.ticketsEsperaDoAgente[i]);
  }
}

console.log("Acessando a página do Backlog");

await page.goto(agtCloudProtheusStdTotal, { waitUntil: 'networkidle2', timeout: 0 });

await page.waitForSelector('[href="/agent/filters/360083846212"]');

await demoraTimeout();

console.log("Colocando o mouse em cima da fila AGT")

await page.hover('[href="/agent/filters/360083846212"]');

console.log("Coletando o print da fila");

await page.screenshot({ path: './1_tickets_abertos.png' });

const ticketsAbertos = await page.evaluate(() => {
  return document.querySelector('[href="/agent/filters/360083846212"]>div:nth-child(3)').innerText
});

console.log("Coletado os tickets em aberto na fila AGT CLOUD PROTHEUS STD");

const ticketsEspera = await page.evaluate(() => {
  return document.querySelector('[href="/agent/filters/360083846332"]>div:nth-child(3)').innerText
});

console.log("Coletado os tickets em espera na fila AGT CLOUD PROTHEUS STD");

console.log("Gerando o gráfico...");


  const myChart = new QuickChart();

  myChart.setWidth(650)
  myChart.setHeight(650);

  myChart.setConfig(`{
    type: 'horizontalBar',
    data: {
      labels: [${listaAgentesComTickets}],
      datasets: [{
        label: 'Tickets Abertos',
        data: [${listaAgentesComTicketsAbertos}],
        backgroundColor: 'rgba(15, 205, 162, 1)',
        borderColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 1
      },
      {
        label: "Tickets em Espera",
        data: [${listaAgentesComTicketsEspera}],
        backgroundColor: 'rgba(3, 64, 83, 1)',
        borderColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 1
      },
    ],
    },
    options: {
      indexAxis: 'y',
          scales: {
              yAxes: [{
                  ticks: {
                      beginAtZero: true
                  }
              }],
          },
      }
  }`);

  console.log("Gerado o gráfico de Abertos e em Espera de cada Agente");

aberto = parseInt(ticketsAbertos);
semAtribuicao = parseInt(ticketsNaoAlocados);
emEspera = parseInt(ticketsEspera);
totalCalcPorcentagem = aberto+semAtribuicao+slaViolado+emEspera;


aberto = ((aberto/totalCalcPorcentagem)*100).toFixed(1);
semAtribuicao = ((semAtribuicao/totalCalcPorcentagem)*100).toFixed(1);
slaVioladoP = ((slaViolado/totalCalcPorcentagem)*100).toFixed(1);
emEspera = ((emEspera/totalCalcPorcentagem)*100).toFixed(1);

const chart = new QuickChart();

chart.setWidth(550)
chart.setHeight(550);

chart.setConfig({
  type: 'doughnut',
  data: {
    datasets: [
      {
        data: [aberto, semAtribuicao, slaVioladoP, emEspera],
        backgroundColor: [
          'rgba(15, 205, 162, 1)',
          'rgb(217, 235, 232)',
          'rgba(247, 151, 0, 1)',
          'rgba(3, 64, 83, 1)'
        ],
        borderColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 1,
        label: 'Dataset 1',
      },
    ],
    labels: ['Abertos', 'Sem Atribuição', 'SLA Violado', 'Em Espera'],
  },
  options: {
    title: {
      display: true,
      text: 'Quadro Geral de Tickets',
    },
    plugins:{
      datalabels: {
        anchor: "end",
        align: 'end',
        color: "black",
        font: {
          weight: "bold",
          size: 16
        },
        formatter: function(value, context) {
          return value+'%';
        }
      }
    },
    layout:{
      padding: {
        left: 30,
        bottom: 50
      }
    }
  }
});
console.log("Gerado o gráfico do Quadro Geral dos Tickets");

// Or write it to a file
chart.toFile('./3_grafico_geral.png');

// Or write it to a file
myChart.toFile('./2_grafico_agentes.png');

console.log("Total de tickets Abertos: " + ticketsAbertos);
console.log("Total de tickets Não Alocados: " + ticketsNaoAlocados);
console.log("Total de tickets Em Espera: " + ticketsEspera);
console.log("Total de tickets com SLA Vencidos: " + slaViolado);

//Pra quando tiver uma observação a ser inserida
//messageContent = 'Diário de Bordo | TOTVS Cloud<br><br>'+saudacao+'<br><br>Caros,<br><br>Segue abaixo a relação de tickets de hoje '+ dd + '/'+ mm + '/' + yyyy +':<br><br>Tickets Abertos: ' + ticketsAbertos.substr(64) + '<br><br>Tickets Não Alocados: ' + ticketsNaoAlocados.substr(74) + '<br><br>Obs.: Hoje temos 2 recursos a menos na equipe.'
messageContent = '_*Diário de Bordo | TOTVS Cloud*_<br><br>'+saudacao+'<br><br>Caros,<br><br>Segue abaixo a relação de tickets de hoje '+ dd + '/'+ mm + '/' + yyyy +':<br><br>Tickets Abertos: *' + ticketsAbertos+ '*<br><br>Tickets Sem Atribuição: *' + ticketsNaoAlocados+'*<br><br>Tickets com violação de SLA: *'+slaViolado+'*<br><br>Tickets em Espera: *'+ticketsEspera+'*<br><br>Tickets abertos e em espera de cada Agente:<br><br>';

fs.writeFileSync('./message_whats.html', messageContent);

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: "587",
    secure: false,
    auth: {
      user: `${yourEmail}`,
      pass: `${yourPassword}`
    }
  });
  
  transporter.sendMail({
    from: `${yourName} <${yourEmail}>`,
    to: `${yourEmail}`,
    //to: "adriano.santana@totvs.com.br, alessandro.macedo@totvs.com.br, anderson.ferreira@totvs.com.br, afelipe@totvs.com.br, beatriz.cruz@totvs.com.br, bianca.zanella@totvs.com.br, crogerio@totvs.com.br, carlos.esilva@totvs.com.br, dennis.terentjvas@totvs.com.br, eduardo.boliveira@totvs.com.br, eliel.oliveira@totvs.com.br, felipe.henrique@totvs.com.br, felipe.mororo@totvs.com.br, gabriella.lopes@totvs.com.br, santos.henrique@totvs.com.br, icaro.cardoso@totvs.com.br, jessica.anjos@totvs.com.br, joao.snascimento@totvs.com.br, jonnathan.santos@totvs.com.br, jrodrigues@totvs.com.br, l.ionafa@totvs.com.br, leandro.alcantara@totvs.com.br, leonardo.lopes@totvs.com.br, lucas.cardona@totvs.com.br, marcelo.silva@totvs.com.br, marcelo.ssilva@totvs.com.br, michel.nascimento@totvs.com.br, miguel.vieira@totvs.com.br, nilson.botelho@totvs.com.br, rogerio.mazuqui@totvs.com.br, vagner.valle@totvs.com.br",
    subject: "Diário de Bordo | TOTVS Cloud | " +hora+ "h",
    html: '<h4>'+saudacao+'<br><br>Caros,<br><br>Segue abaixo a relação de tickets de hoje '+ dd + '/'+ mm + '/' + yyyy +':<br><br>Tickets Abertos: ' + ticketsAbertos + '<br><br>Tickets Sem Atribuição: ' + ticketsNaoAlocados + '<br><br>Tickets com violação de SLA: '+slaViolado+'<br><br>Tickets em Espera: '+ticketsEspera+'<br><br><img src="cid:print_zendesk"/><br><br><br><br><img src="cid:grafico_geral"/><br><br><br><br>Relação de tickets abertos e em espera de cada agente:<br><br><img src="cid:grafico"/><br><br>Atenciosamente,</h4><b>' +`${yourName}`+ ' / <font color="#EA9B3E">CLOUD COMPUTING</font></b><br>TOTVS MATRIZ<BR><a>(11) 4003-0015</a><br><b><strong>A TOTVS ACREDITA NO BRASIL QUE FAZ<br><img src="https://totvs.com/assinatura/11-assinatura-email-logo-totvs.gif"/>',
    attachments: [
        { 
          filename: '1_tickets_abertos.png',
          path: './1_tickets_abertos.png',
          cid: 'print_zendesk'
    },
    {
      filename: '2_grafico_agentes.png',
      path: './2_grafico_agentes.png',
      cid: 'grafico'
    },
    {
      filename: '3_grafico_geral.png',
      path: './3_grafico_geral.png',
      cid: 'grafico_geral'
    }]
    }).then(message => {
      console.log("E-mail enviado com sucesso!");
    }).catch(err => {
      console.log(err + "Houve um erro ao enviar o e-mail!");
    });
  
  await browser.close();
})();

//Funções necessárias em javascript para pausar o código por um tempo, foi necessário para carregar cada página que é acessada ao clicar pelo menu de navegação.
async function demora(){
  await sleep(5000);
  console.log('Página carregada depois de 5 Segundos ...> ');
}

async function sleep(ml){
  return new Promise (resolve => setTimeout(resolve, ml));
}

async function demoraTimeout(){
  console.log("Página está travada, esperando 20 segundos para carregar a página...")
  await sleepTimeout(20000);
  console.log('Pagina carregada ...> ');
}

async function sleepTimeout(ml){
  return new Promise (resolve => setTimeout(resolve, ml));
}