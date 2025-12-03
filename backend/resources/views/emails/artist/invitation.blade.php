<x-mail::message>
# {{ $user->real_name }} 様

NOKKUへのアーティスト招待が届きました。
以下のログイン情報を使用して、管理画面へログインしてください。

<x-mail::panel>
**メールアドレス:** {{ $user->email }}<br>
**パスワード:** {{ $rawPassword }}
</x-mail::panel>

※セキュリティのため、ログイン後にパスワードを変更することをお勧めします。

<x-mail::button :url="config('app.url') . '/admin'">
管理画面へログイン
</x-mail::button>

よろしくお願いいたします。<br>
{{ config('app.name') }}
</x-mail::message>