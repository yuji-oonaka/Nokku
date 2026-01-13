<?php

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\TicketType;
use Illuminate\Support\Carbon;

class CreateTicketPaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'ticket_id' => ['required', 'integer', 'exists:ticket_types,id'],
            'quantity'  => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * バリデーション完了後のフック (追加チェック)
     * ここで「過去のイベントではないか」を確認します。
     */
    public function after(): array
    {
        return [
            function ($validator) {
                // バリデーション済みのデータを取得
                $data = $validator->validated();

                // 基本バリデーションで弾かれていればチェックしない
                if (!isset($data['ticket_id'])) return;

                $ticket = TicketType::with('event')->find($data['ticket_id']);

                // イベント終了日を過ぎていないかチェック
                if ($ticket && $ticket->event) {
                    $eventDate = Carbon::parse($ticket->event->event_date)->endOfDay();
                    if ($eventDate->isPast()) {
                        $validator->errors()->add(
                            'ticket_id',
                            'このイベントは既に終了しています'
                        );
                    }
                }
            }
        ];
    }
}
