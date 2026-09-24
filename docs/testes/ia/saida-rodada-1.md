# Rodada 1 — saída da IA (íntegra, sem correção)

> Este arquivo registra a saída **exatamente como recebida**, em resposta ao
> prompt da seção 4.1 do plano de testes. Nenhum caso foi corrigido, reordenado
> ou completado depois da geração — inclusive os que se revelaram errados ou
> incompletos ao comparar com o contrato real do produto (`data/contrato.js`).
> A análise dessas divergências está nas "Três perguntas sobre a saída", no
> plano de testes, seção 4.1 — não aqui.

---

## Casos de teste — API ResolveAí

### Cadastro (`POST /auth/register`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC01 | Cadastro com dados válidos | Enviar name, email e password válidos | 201 Created, retorna o usuário criado com role "citizen" |
| TC02 | Cadastro com e-mail já existente | Repetir um e-mail já cadastrado | 409 Conflict, mensagem informando e-mail duplicado |
| TC03 | Cadastro com e-mail em formato inválido | Enviar "email": "teste@" | 400 Bad Request |
| TC04 | Cadastro com senha curta | Enviar senha com 4 caracteres | 400 Bad Request, senha deve ter no mínimo 8 caracteres |
| TC05 | Cadastro sem o campo name | Omitir o campo name | 400 Bad Request |
| TC06 | Cadastro tentando definir role diretamente | Enviar "role": "admin" no corpo | Deve ser ignorado ou rejeitado; usuário criado como "citizen" |
| TC07 | Resposta de cadastro não deve vazar a senha | Inspecionar o corpo da resposta | Campo password/hash não deve estar presente |

### Login (`POST /auth/login`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC08 | Login com credenciais válidas | Enviar email e password corretos | 200 OK, retorna access_token e refresh_token |
| TC09 | Login com senha incorreta | Enviar senha errada | 401 Unauthorized |
| TC10 | Login com e-mail inexistente | Enviar e-mail que não existe na base | 401 Unauthorized (mesma mensagem do caso de senha errada) |
| TC11 | Login sem preencher e-mail | Omitir o campo email | 400 Bad Request |

### Perfil (`GET /auth/me`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC12 | Consultar perfil autenticado | Enviar token válido no header Authorization | 200 OK, retorna os dados do usuário logado |
| TC13 | Consultar perfil sem token | Não enviar header Authorization | 401 Unauthorized |
| TC14 | Consultar perfil com token expirado | Usar um token expirado | 401 Unauthorized |

### Atualização de perfil / promoção (`PATCH /auth/update`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC15 | Admin promove um cidadão a gestor | Logar como admin, enviar PATCH com role "manager" pro usuário alvo | 200 OK, role do usuário alterado para manager |
| TC16 | Cidadão tenta se autopromover | Logar como citizen, enviar PATCH com role "manager" | 403 Forbidden |
| TC17 | Gestor tenta promover outro usuário | Logar como manager, enviar PATCH com role "manager" | 403 Forbidden (só admin promove) |

### Refresh (`POST /auth/refresh`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC18 | Renovar token com refresh_token válido | Enviar refresh_token válido | 200 OK, novo access_token retornado |
| TC19 | Renovar com refresh_token inválido | Enviar token malformado | 401 Unauthorized |
| TC20 | Usar access_token no lugar do refresh_token | Enviar access_token no campo refresh_token | 401 Unauthorized |

### Logout (`GET /auth/logout`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC21 | Logout com sessão ativa | Enviar token válido | 200 OK, token invalidado |
| TC22 | Usar o token depois do logout | Repetir uma chamada autenticada com o mesmo token | 401 Unauthorized |

### Listar demandas (`GET /api/demandas`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC23 | Cidadão lista suas demandas | Logar como citizen e listar | 200 OK, retorna só as demandas do próprio usuário |
| TC24 | Gestor lista todas as demandas | Logar como manager e listar | 200 OK, retorna demandas de todos os cidadãos |
| TC25 | Listar com paginação | Enviar page=1 e pageSize=10 | 200 OK, retorna 10 itens e metadados de paginação |
| TC26 | Filtrar por status | Enviar status=pending | 200 OK, retorna só demandas pendentes |
| TC27 | Listar sem autenticação | Não enviar token | 401 Unauthorized |

### Criar demanda (`POST /api/demandas`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC28 | Cidadão cria demanda válida | Enviar category, description e location válidos | 201 Created, demanda criada com status "pending" |
| TC29 | Gestor tenta criar demanda | Logar como manager e criar | 403 Forbidden (só cidadão cria) |
| TC30 | Criar demanda sem descrição | Omitir o campo description | 400 Bad Request |
| TC31 | Criar demanda sem autenticação | Não enviar token | 401 Unauthorized |

### Detalhe da demanda (`GET /api/demandas/{id}`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC32 | Consultar demanda existente | Buscar por um id válido | 200 OK, retorna os detalhes da demanda |
| TC33 | Consultar demanda inexistente | Buscar por id que não existe | 404 Not Found |
| TC34 | Cidadão tenta ver demanda de outro cidadão | Buscar demanda de outro usuário | 403 Forbidden |

### Atualizar demanda (`PATCH /api/demandas/{id}`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC35 | Gestor atualiza o status da demanda | Enviar status="in_progress" | 200 OK, status atualizado |
| TC36 | Gestor atualiza a prioridade | Enviar priority="high" | 200 OK, prioridade atualizada |
| TC37 | Cidadão tenta atualizar status | Logar como citizen e enviar PATCH | 403 Forbidden |
| TC38 | Atualizar com status inválido | Enviar status="finalizado" (fora da lista aceita) | 400 Bad Request |

### Excluir demanda (`DELETE /api/demandas/{id}`)

| ID | Cenário | Passos | Resultado esperado |
| :-- | :--- | :--- | :--- |
| TC39 | Cidadão exclui a própria demanda pendente | Deletar demanda própria com status pending | 200 OK, demanda removida |
| TC40 | Cidadão tenta excluir demanda de outro cidadão | Deletar demanda de outro usuário | 403 Forbidden |
| TC41 | Gestor tenta excluir demanda já concluída | Deletar demanda com status "resolved" | 403 Forbidden |
| TC42 | Excluir demanda inexistente | Deletar id que não existe | 404 Not Found |

---

**Observação final da IA (incluída na resposta original):** "Esses casos cobrem os principais fluxos de autenticação, autorização e CRUD de demandas da API ResolveAí, incluindo cenários positivos e negativos. Recomenda-se complementar com testes de carga e segurança adicionais conforme a necessidade do projeto."
