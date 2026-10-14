"""Semeia os usuarios de teste no banco do back-end real (ndrfelipe/smart-city).

O cadastro publico (POST /auth/register) forca role 'cidadao', entao gestor e
admin so existem se forem inseridos direto no banco. Usa os modelos do proprio
back-end, para o hash da senha ser o mesmo que o login confere.

Uso (de dentro da pasta backend/ do back-end, com DATABASE_URL apontando
para o banco que o servidor vai usar):

    PYTHONPATH=. python /caminho/para/semear-backend-real.py
"""

import os

from config.config import create_app
from config.extensions import db
from models.user import User

SENHA = os.getenv("SENHA_PADRAO", "senha123")

USUARIOS = [
    ("Ana Cidada", os.getenv("USUARIO_CIDADAO", "ana@exemplo.com"), "cidadao"),
    ("Bruno Cidadao", os.getenv("USUARIO_CIDADAO_2", "bruno@exemplo.com"), "cidadao"),
    ("Gestor Teste", os.getenv("USUARIO_GESTOR", "gestor@exemplo.com"), "gestor"),
    ("Admin Teste", os.getenv("USUARIO_ADMIN", "admin@exemplo.com"), "admin"),
]

app = create_app()
with app.app_context():
    for username, email, role in USUARIOS:
        if User.get_user_by_email(email):
            print(f"ja existe: {email} ({role})")
            continue
        # Sessao direta (e nao User.add): User.add engole a excecao e devolve
        # False, o que esconderia a causa real de uma falha de seed.
        db.session.add(User(username=username, email=email, password=SENHA, role=role))
        db.session.commit()
        print(f"semeado: {email} ({role})")
