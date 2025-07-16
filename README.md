# problem-prisma-dmmf-garbled

```
rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json
```


```
node@d823bc82a670:/workspaces/problem-prisma-dmmf-garbled$ rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json 
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.12.0) to ./node_modules/.pnpm/@prisma+client@6.12.0_prisma@6.12.0_typescript@5.8.3__typescript@5.8.3/node_modules/@prisma/client in 367ms

✔ Generated Prisma Database Comments to ./prisma/migrations in 336ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints

6776:            "documentation": "最終更新�� - 最後に更新した担当者"
10389:            "documentation": "承���日時 - 検査結果が承認された日時"
```
