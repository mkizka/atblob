# @gyaku/di リファレンス

atcdnのcore内部のDIに使用するライブラリ([spec.md](../spec.md) の「依存性注入(DI)」を参照)。

- リポジトリ: https://github.com/mkizka/gyaku
- npm: https://www.npmjs.com/package/@gyaku/di
- ライセンス: MIT
- 要件: **Node.js 24+**

## 概要

Gyaku(逆、"inversion")は `await using` を軸にしたTypeScript向けの小さなDIコンテナ。

- 型安全なレジストリチェーン(未知の依存キー・キー重複はコンパイル時にエラー)
- デコレータ・`reflect-metadata` 不要
- 同期・非同期ファクトリを同じAPIで扱える
- 依存グラフに沿った並列resolve
- `await using` によるグラフ順(逆順)・並列の破棄。`Symbol.asyncDispose` / `Symbol.dispose` の両方に対応
- resolve途中で失敗した場合、生成済みのサービスを自動でクリーンアップ

## 基本的な使い方

```ts
import { createRegistry } from "@gyaku/di";

const createGreeter = ({ name }: { name: string }) => ({
  say: () => console.log(`hello, ${name}`),
});

const registry = createRegistry()
  .value("name", "gyaku")
  .service("greeter", ["name"], createGreeter);

await using services = await registry.resolve();
services.greeter.say();
// hello, gyaku
```

## API

### `createRegistry()`

空のイミュータブルなレジストリを返す。

### `.value(key, instance)`

生成済みの値をそのままの型で登録する。

```ts
createRegistry().value("config", { port: 3000 });
```

### `.service(key, factory)` / `.service(key, deps, factory)`

同期または非同期のファクトリを登録する。ファクトリは `deps` に列挙した依存だけを受け取る。

```ts
const registry = createRegistry()
  .value("config", { port: 3000 })
  .service("logger", createLogger)
  .service("server", ["config", "logger"], createServer);
```

### `.replaceService(key, factory)` / `.replaceValue(key, instance)`

登録済みのサービスを差し替える。元のdepsと戻り値の型は維持される。テスト用スタブや実装切り替え(Redis / インメモリ等)に使う。

```ts
const testRegistry = productionRegistry.replaceService("db", createStubDb);
const testRegistry2 = productionRegistry.replaceValue("db", stubDb);
```

同じキーを `.service` / `.value` で再登録すると例外になる。差し替えは必ず `.replaceService` / `.replaceValue` を使う。

### `resolve()`

依存グラフを解決して `Promise<Services & AsyncDisposable>` を返す。

- ファクトリはグラフに沿って並列実行される
- `await using` でグラフの逆順に破棄される
- 失敗時は生成済みのサービスが自動で破棄される

### エラー

すべて `GyakuError` を継承する。

| エラー          | 発生箇所                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `RegistryError` | `.service` / `.value` / `.replaceService` / `.replaceValue` への不正な引数                       |
| `ResolveError`  | `resolve()` の失敗。`errors` に `ServiceFactoryError` と `ServiceDisposeError` が混在する        |
| `DisposeError`  | `Symbol.asyncDispose` の失敗。`errors` は `ServiceDisposeError[]`                                |

内側のエラーは `.key`(失敗したサービス)と `.cause`(元の例外)を持つ。

```ts
import { ResolveError } from "@gyaku/di";

try {
  await using services = await registry.resolve();
} catch (error) {
  if (error instanceof ResolveError) {
    for (const e of error.errors) {
      console.error(e.key, e.cause);
    }
  }
}
```

### 注意点

- `then` はキーとして予約されている(servicesオブジェクトがthenableに見えてしまうため)
- servicesオブジェクトはnullプロトタイプなので `__proto__` 等のキーも安全

## 移行ヘルパー

gyakuの標準ファクトリは「depsオブジェクトを1つ受け取る関数」(`({ logger, db }) => ...`)。この形に合わないコードを書き換えずに登録するためのヘルパー。

### `asFunctionArgs(fn)`

位置引数を取る関数をラップする。`deps` は引数の順に列挙する。

```ts
const createRepo = (logger: Logger, db: Db) => ({
  find: (sql: string) => db.query(sql),
});

createRegistry().service("repo", ["logger", "db"], asFunctionArgs(createRepo));
```

### `asClass(Class)`

コンストラクタがdepsオブジェクトを1つ受け取るクラスをラップする(`(deps) => new Foo(deps)` を省略できる)。

```ts
class Greeter {
  constructor(private deps: { logger: Logger }) {}
}

createRegistry().service("greeter", ["logger"], asClass(Greeter));
```

### `asClassArgs(Class)`

`asFunctionArgs` のクラス版。位置引数のコンストラクタに使う。

### インターフェースへのピン留め

`asClass<Interface>()(Class)` で、具象クラスではなくインターフェースの型で登録できる(`asClassArgs` も同様)。`.replaceService` / `.replaceValue` の差し替え先はレジストリに登録された型に一致する必要があるため、インターフェースにピン留めしておくとスタブはそのインターフェースを満たすだけでよくなる。

```ts
interface UserRepository {
  find(id: number): Promise<User | undefined>;
}

class UserRepositoryImpl implements UserRepository {
  constructor(private deps: { db: Db }) {}
  find(id: number) {
    return this.deps.db.findUser(id);
  }
}

const registry = createRegistry()
  .service("db", createDb)
  .service(
    "userRepository",
    ["db"],
    asClass<UserRepository>()(UserRepositoryImpl),
  );

// スタブはUserRepositoryを満たすだけでよい
const testRegistry = registry.replaceValue("userRepository", {
  find: async (id) => ({ id, name: "stub" }),
});
```
