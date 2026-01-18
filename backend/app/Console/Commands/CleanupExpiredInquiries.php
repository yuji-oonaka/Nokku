<?php

namespace App\Console\Commands;

use App\Models\Inquiry;
use Illuminate\Console\Command;

class CleanupExpiredInquiries extends Command
{
    /**
     * コマンドラインで実行する際の名前
     * 例: sail artisan inquiries:cleanup
     */
    protected $signature = 'inquiries:cleanup';

    /**
     * コマンドの説明
     */
    protected $description = '保存期限(expires_at)を過ぎた解決済みお問い合わせを論理削除します';

    /**
     * コマンドの実行処理
     */
    public function handle()
    {
        // 削除対象: 期限が設定されており、かつ期限を過ぎているもの
        // SoftDeletesが入っているため、delete() は論理削除になります
        $count = Inquiry::whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->delete();

        if ($count > 0) {
            $this->info("期限切れのお問い合わせ {$count} 件を論理削除しました。");
            // ログにも残す
            \Illuminate\Support\Facades\Log::info("CleanupExpiredInquiries: {$count} records soft-deleted.");
        } else {
            $this->info('削除対象のお問い合わせはありませんでした。');
        }
    }
}
