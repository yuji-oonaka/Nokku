@extends('layouts.simple')

@section('title', 'トップ')

@section('content')
    <div class="text-center py-12">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">NOKKU</h2>
        <p class="text-gray-600 mb-8">
            ライブイベントのチケット予約・物販を、<br>もっと身近に、もっとスムーズに。
        </p>

        {{-- アプリストアバッジ（仮） --}}
        <div class="flex justify-center gap-4 mb-12">
            <span class="bg-gray-200 text-gray-500 px-4 py-2 rounded rounded-lg text-sm">
                App Store (準備中)
            </span>
            <span class="bg-gray-200 text-gray-500 px-4 py-2 rounded rounded-lg text-sm">
                Google Play (準備中)
            </span>
        </div>

        <div class="border-t pt-8 text-left">
            <h3 class="font-bold text-gray-700 mb-4">メニュー</h3>
            <ul class="space-y-2 text-indigo-600 underline">
                <li><a href="{{ route('terms') }}">利用規約</a></li>
                <li><a href="{{ route('privacy') }}">プライバシーポリシー</a></li>
                <li><a href="{{ route('legal') }}">特定商取引法に基づく表記</a></li>
            </ul>
        </div>
        
        <div class="border-t mt-8 pt-8 text-left">
            <h3 class="font-bold text-gray-700 mb-4">アーティスト・運営の方</h3>
            <p class="mb-4 text-sm text-gray-500">
                グッズの登録や売上の確認は管理画面から行えます。
            </p>
            <a href="/admin" class="inline-block bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition">
                管理画面へログイン
            </a>
        </div>
    </div>
@endsection