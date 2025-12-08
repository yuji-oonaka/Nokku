<div class="flex items-center gap-x-2.5">
    {{-- シンボルロゴ --}}
    <img 
        src="{{ asset('images/Nokku_logo.jpg') }}" 
        alt="NOKKU" 
        class="h-9 w-auto"
    >
    
    {{-- テキスト部分 --}}
    <div class="flex items-baseline gap-x-1.5 select-none">
        {{-- メインロゴ: フォントを少し詰めて太く --}}
        <span class="text-xl font-bold tracking-tight text-gray-950 dark:text-white">
            NOKKU
        </span>

        {{-- 権限バッジ: 小さく、薄く、大文字で表示 --}}
        @if(auth()->user()?->role === 'artist')
            <span class="text-[0.65rem] font-semibold text-emerald-500 uppercase tracking-wider border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                Artist
            </span>
        @else
            <span class="text-[0.65rem] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Admin
            </span>
        @endif
    </div>
</div>