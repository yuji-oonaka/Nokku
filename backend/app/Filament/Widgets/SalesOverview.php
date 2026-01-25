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
        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        // ユーザーが取得できない場合は空配列を返す（鉄壁の守り）
        if (!$user instanceof \App\Models\User) {
            return [];
        }

        $query = Order::query()->where('status', 'completed');

        // アーティスト権限の場合は自分の売上のみに限定
        if ($user->isArtist()) {
            $query->forArtist($user->id);
        }

        // 基本となる「売上」カード
        $stats = [
            Stat::make('売上 (Sales)', Number::currency($query->sum('total_price'), 'JPY'))
                ->description($user->isAdmin() ? 'プラットフォーム全売上' : '自身の販売総額')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('success'),
        ];

        // ★重要: Adminの場合のみ「プラットフォーム収益」カードを配列に追加する
        if ($user->isAdmin()) {
            $stats[] = Stat::make('プラットフォーム収益', Number::currency($query->sum('platform_fee'), 'JPY'))
                ->description('システム手数料 (10%)')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color('info');
        }

        // 最後に「振込対象額」カードを配列に追加
        $stats[] = Stat::make('振込対象額', Number::currency($query->sum('payout_amount'), 'JPY'))
            ->description($user->isAdmin() ? '全アーティストへの振込予定額' : '自身への振込予定額')
            ->descriptionIcon('heroicon-m-arrow-right-circle')
            ->color('warning');

        return $stats;
    }
}
