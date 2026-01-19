<?php

namespace App\Filament\Widgets;

use App\Models\Order;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Number;
use Illuminate\Support\Facades\Auth; // ★追加: 権限チェック用

class SalesOverview extends BaseWidget
{
    // 表示更新頻度
    protected static ?string $pollingInterval = '15s';

    // ★追加: ウィジェットの表示権限設定
    // これでOperatorには売上が見えなくなります
    public static function canView(): bool
    {
        $user = Auth::user();

        // ログインしていない場合は非表示
        if (!$user) {
            return false;
        }

        // AdminとArtistのみ表示許可 (Operatorは除外)
        return in_array($user->role, ['admin', 'artist']);
    }

    protected function getStats(): array
    {
        $query = Order::query()->where('status', 'completed');

        return [
            Stat::make('総売上 (Gross Sales)', Number::currency($query->sum('total_price'), 'JPY'))
                ->description('決済完了済み注文総額')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('success')
                ->chart([7, 2, 10, 3, 15, 4, 17]),

            Stat::make('プラットフォーム収益', Number::currency($query->sum('platform_fee'), 'JPY'))
                ->description('手数料収入 (10%)')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color('info'),

            Stat::make('アーティスト振込対象額', Number::currency($query->sum('payout_amount'), 'JPY'))
                ->description('今後の振込義務額')
                ->descriptionIcon('heroicon-m-arrow-right-circle')
                ->color('warning'),
        ];
    }
}
