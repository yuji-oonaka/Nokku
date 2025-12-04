@extends('layouts.simple')

@section('title', '特定商取引法に基づく表記')

@section('content')
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
        
        <div class="md:col-span-1 font-bold text-gray-600">販売業者</div>
        <div class="md:col-span-2">NOKKU運営事務局</div>

        <div class="md:col-span-1 font-bold text-gray-600">運営統括責任者</div>
        <div class="md:col-span-2">（代表者名などを記載）</div>

        <div class="md:col-span-1 font-bold text-gray-600">所在地</div>
        <div class="md:col-span-2">（事業者の住所を記載）</div>

        <div class="md:col-span-1 font-bold text-gray-600">販売価格</div>
        <div class="md:col-span-2">各商品ページに記載</div>

        <div class="md:col-span-1 font-bold text-gray-600">商品代金以外の必要料金</div>
        <div class="md:col-span-2">配送料（商品ごとに異なる場合はその旨を記載）</div>

        <div class="md:col-span-1 font-bold text-gray-600">支払方法</div>
        <div class="md:col-span-2">クレジットカード決済</div>

        <div class="md:col-span-1 font-bold text-gray-600">商品の引渡時期</div>
        <div class="md:col-span-2">決済完了後、通常○日以内に発送</div>

        <div class="md:col-span-1 font-bold text-gray-600">返品・交換について</div>
        <div class="md:col-span-2">商品に欠陥がある場合を除き、基本的には返品・交換には応じません。</div>

    </div>
@endsection