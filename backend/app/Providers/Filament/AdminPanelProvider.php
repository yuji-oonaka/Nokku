<?php

namespace App\Providers\Filament;

use Jeffgreco13\FilamentBreezy\BreezyCore;

use Filament\Support\Facades\FilamentView;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\Facades\Blade;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use App\Filament\Widgets\SalesOverview;

class AdminPanelProvider extends PanelProvider
{
    public function boot(): void
    {
        // ユーザーメニュー(右上の丸アイコン)の「左側」に要素を追加
        FilamentView::registerRenderHook(
            PanelsRenderHook::USER_MENU_BEFORE,
            fn (): string => Blade::render(<<<'HTML'
                <div class="flex items-center gap-4 mr-2">
                    {{-- 1. ユーザー名を表示 (PCのみ) --}}
                    @if(auth()->check())
                        <div class="hidden md:flex flex-col text-right">
                            <span class="text-sm font-bold text-gray-800 dark:text-white">
                                {{ auth()->user()->nickname ?? auth()->user()->real_name }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                {{ auth()->user()->role === 'artist' ? 'Artist' : 'Admin' }}
                            </span>
                        </div>
                    
                        {{-- 2. わかりやすいログアウトボタン --}}
                        <form action="{{ filament()->getLogoutUrl() }}" method="post">
                            @csrf
                            <button 
                                type="submit"
                                class="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="ログアウト"
                            >
                                {{-- ログアウトアイコン --}}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                </svg>
                                <span class="hidden md:inline">ログアウト</span>
                            </button>
                        </form>
                    @endif
                </div>
            HTML)
        );
    }

    public function panel(Panel $panel): Panel
    {
        
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->brandLogo(fn () => view('filament.logo'))
            ->colors([
                'primary' => Color::Amber,
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Pages\Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                // Widgets\AccountWidget::class,
                // Widgets\FilamentInfoWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ])
            ->plugin(
                BreezyCore::make()
                    ->myProfile(
                        shouldRegisterUserMenu: true, // 右上のメニューに「マイプロフィール」を追加
                        shouldRegisterNavigation: false, // 左側のナビゲーションには表示しない
                        hasAvatars: false, // アバター画像機能（今回はOFF）
                        slug: 'my-profile'
                    )
                    ->enableTwoFactorAuthentication(
                        force: false, // 全員に強制するかどうか（最初はfalseで任意にするのが無難）
                    )
            );
    }
}