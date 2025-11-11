<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // 1. Auth を use
// Inquiry モデルは App\Models\Inquiry にあるため、
// App\Http 名前空間からは use App\Models\Inquiry; が必要
use App\Models\Inquiry;

class InquiryController extends Controller
{
    /**
     * 新しいお問い合わせを保存する
     */
    public function store(Request $request)
    {
        // 1. バリデーション
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000', // 5000文字まで
        ]);

        // 2. 認証済みユーザーを取得
        $user = Auth::user();

        // 3. お問い合わせを作成
        // $fillable なので $validated をそのまま渡せる
        $inquiry = $user->inquiries()->create($validated);

        // 4. 成功レスポンス
        // (将来的に admin 側がメール通知を受け取る処理などを追加できる)

        return response()->json([
            'message' => 'お問い合わせが正常に送信されました。',
            'inquiry' => $inquiry
        ], 201); // 201 Created
    }
}