<?php

namespace App\Filament\Widgets;

use App\Models\Order;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Number; // Laravel 10/11のヘルパー

class SalesOverview extends BaseWidget
{
    // 表示更新頻度 (オプション: 自動更新したくない場合は削除)
    protected static ?string $pollingInterval = '15s';

    protected function getStats(): array
    {
        // 決済完了(completed)の注文のみを集計対象とする
        // ※ステータス値は実際のプロジェクトに合わせて調整してください（例: 'paid', 'captured' 等）
        $query = Order::query()->where('status', 'completed');

        return [
            Stat::make('総売上 (Gross Sales)', Number::currency($query->sum('total_price'), 'JPY'))
                ->description('決済完了済み注文総額')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('success')
                ->chart([7, 2, 10, 3, 15, 4, 17]), // ダミーのチャート装飾

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