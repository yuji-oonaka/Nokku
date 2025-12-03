<?php

namespace App\Filament\Resources\OrderResource\Pages;

use App\Filament\Resources\OrderResource;
use App\Mail\ShippingNotificationMail; // ★追加
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Mail; // ★追加

class EditOrder extends EditRecord
{
    protected static string $resource = OrderResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    /**
     * ★追加: 保存後の処理
     * ステータスが「発送済み(shipped)」に変更された場合、メールを送信する
     */
    protected function afterSave(): void
    {
        // レコード（注文データ）を取得
        $order = $this->record;

        // ステータスが今回 'shipped' に変更され、かつユーザーメールがある場合
        // (wasChanged('status') は今回のリクエストで変更があったかを判定します)
        if ($order->wasChanged('status') && $order->status === 'shipped' && $order->user && $order->user->email) {
            
            Mail::to($order->user->email)->send(
                new ShippingNotificationMail($order)
            );
            
            // オプション: 通知を画面に出す
            // Notification::make()->title('発送メールを送信しました')->success()->send();
        }
    }
}