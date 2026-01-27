<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\TicketType;
use Illuminate\Support\Carbon;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // 認証はmiddleware側で制御
    }

    public function rules(): array
    {
        return [
            // 商品ID: チケットIDがない場合は必須。存在チェックも行う
            'product_id'      => ['required_without:ticket_type_id', 'nullable', 'integer', 'exists:products,id'],
            
            // チケット種別ID: 商品IDがない場合は必須
            'ticket_type_id'  => ['required_without:product_id', 'nullable', 'integer', 'exists:ticket_types,id'],
            
            'quantity'        => ['required', 'integer', 'min:1'],
            'payment_method'  => ['required', 'string', Rule::in(['stripe', 'cash'])],
            'delivery_method' => ['required', 'string', Rule::in(['mail', 'venue'])],
        ];
    }

    /**
     * バリデーション完了後の追加チェック
     */
    public function after(): array
    {
        return [
            function ($validator) {
                $data = $validator->validated();

                // 1. 商品とチケットの両方が指定されていないかチェック (排他制御)
                if (!empty($data['product_id']) && !empty($data['ticket_type_id'])) {
                    $validator->errors()->add('product_id', '商品とチケットを同時に注文することはできません。');
                }

                // 2. チケットの場合、イベントが終了していないかチェック
                if (!empty($data['ticket_type_id'])) {
                    $ticket = TicketType::with('event')->find($data['ticket_type_id']);
                    if ($ticket && $ticket->event) {
                        $eventDate = Carbon::parse($ticket->event->event_date)->endOfDay();
                        if ($eventDate->isPast()) {
                            $validator->errors()->add('ticket_type_id', 'このイベントは既に終了しています。');
                        }
                    }
                }
            }
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.required_without' => '商品またはチケットのいずれかを選択してください。',
            'ticket_type_id.required_without' => '商品またはチケットのいずれかを選択してください。',
            'product_id.exists' => '選択された商品は存在しません。',
            'ticket_type_id.exists' => '選択されたチケットは存在しません。',
            'quantity.min' => '数量は1つ以上で指定してください。',
        ];
    }
}