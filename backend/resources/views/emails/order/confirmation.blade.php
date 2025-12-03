<x-mail::message>
# {{ $order->user->real_name ?? 'お客様' }} 様

NOKKUをご利用いただきありがとうございます。
以下の内容でご注文を承りました。

<x-mail::panel>
**注文ID:** {{ $order->id }}<br>
**注文日時:** {{ $order->created_at->format('Y年m月d日 H:i') }}
</x-mail::panel>

## 🛒 ご注文内容

<x-mail::table>
| 商品名 | 単価 | 数量 | 小計 |
| :--- | :--- | :--- | :--- |
@foreach($order->items as $item)
| {{ $item->product_name }} | ¥{{ number_format($item->price) }} | {{ $item->quantity }} | ¥{{ number_format($item->price * $item->quantity) }} |
@endforeach
| | | **合計** | **¥{{ number_format($order->total_amount) }}** |
</x-mail::table>

## 📦 配送先情報
〒{{ $order->shipping_address['postal_code'] ?? '' }}<br>
{{ $order->shipping_address['prefecture'] ?? '' }} {{ $order->shipping_address['city'] ?? '' }} {{ $order->shipping_address['address_line1'] ?? '' }}<br>
{{ $order->shipping_address['address_line2'] ?? '' }}<br>
{{ $order->shipping_address['phone_number'] ?? '' }}

<x-mail::button :url="config('app.url')">
アプリを開く
</x-mail::button>

※ 本メールは送信専用です。

よろしくお願いいたします。<br>
{{ config('app.name') }}
</x-mail::message>