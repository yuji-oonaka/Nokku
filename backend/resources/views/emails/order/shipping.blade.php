<x-mail::message>
# {{ $order->user->real_name ?? 'お客様' }} 様

いつもNOKKUをご利用いただきありがとうございます。
ご注文の商品を本日発送いたしました。

<x-mail::panel>
**配送状況の確認:**
追跡番号: **{{ $order->tracking_number ?? 'なし' }}**
</x-mail::panel>

## 📦 お届け先
〒{{ $order->shipping_address['postal_code'] ?? '' }}<br>
{{ $order->shipping_address['prefecture'] ?? '' }} {{ $order->shipping_address['city'] ?? '' }} {{ $order->shipping_address['address_line1'] ?? '' }}<br>
{{ $order->shipping_address['address_line2'] ?? '' }}

到着まで今しばらくお待ちください。

<x-mail::button :url="config('app.url')">
アプリで注文履歴を見る
</x-mail::button>

よろしくお願いいたします。<br>
{{ config('app.name') }}
</x-mail::message>