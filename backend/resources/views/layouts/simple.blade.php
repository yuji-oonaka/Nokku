<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title') | {{ config('app.name') }}</title>
    {{-- Tailwind CSS (CDN) --}}
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800 antialiased">

    {{-- ヘッダー --}}
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" class="font-bold text-xl text-indigo-600">NOKKU</a>
            <nav class="space-x-4 text-sm text-gray-500">
                <a href="{{ route('terms') }}" class="hover:text-indigo-600">利用規約</a>
                <a href="{{ route('privacy') }}" class="hover:text-indigo-600">プライバシー</a>
            </nav>
        </div>
    </header>

    {{-- メインコンテンツ --}}
    <main class="max-w-3xl mx-auto px-4 py-8 bg-white min-h-screen shadow-sm my-4 rounded-lg">
        <h1 class="text-2xl font-bold mb-6 border-b pb-4">@yield('title')</h1>
        <div class="prose prose-indigo max-w-none text-sm leading-relaxed space-y-4">
            @yield('content')
        </div>
    </main>

    {{-- フッター --}}
    <footer class="text-center py-8 text-gray-400 text-xs">
        &copy; {{ date('Y') }} {{ config('app.name') }} All rights reserved.
    </footer>

</body>
</html>