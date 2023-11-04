# Automação de Relatório Diário

Programa desenvolvido para automatizar a geração de relatório diário com a relação de tickets:
  - Abertos
  - Espera
  - Novos
  - SLA estourado
  - Gerar gráficos de acordo com os dados obtidos através do Zendesk
  - E enviar por e-mail

# Getting Started

Instalar o **nodejs** na máquina.

https://nodejs.org/en/

Instalar as **dependencias contidas no package.json**:

- npm i

Alterar o arquivo **.env** com os dados pessoais

Habilitar o email para apps não seguros na página de configurações do email no link abaixo:

https://myaccount.google.com/
Depois em > **Segurança** > **Acesso a app menos seguro**

Obs.: Talvez seja necessário criar uma visualização pessoal no zendesk com os seguintes filtros:

https://totvssuporte.zendesk.com/admin/workspaces/agent-workspace/

**AGT CLOUD PROTHEUS STD - ABERTOS**

**todas condições**: Status > Menor que > Pendente


**qualquer condição**:
- Grupo > É > Cloud Atendimento
- Grupo > É > Cloud PROTHEUS STD
- Grupo > É > Cloud TAF/TSS
- Grupo > É > Cloud 1;2;3;4

**Colunas:**
- ID
- Atribuido
- Assunto
- Organização
- Proxima violação de SLA

Com o href dessa visualização será necessário ajustar o valor da variável **agtCloudProtheusStdTotal** e os respectivos href

Segue abaixo exemplo de execução do script para gerar os relatórios da equipe:

relatorio geral da equipe.jpeg
