<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Kreait\Firebase\Exception\Auth\EmailExists;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    /**
     * データの作成前に実行される処理
     * ここでFirebaseにユーザーを作成し、UIDを取得します。
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // 1. Firebase Authのインスタンスを取得
        $auth = app('firebase.auth');

        try {
            // 2. Firebaseでユーザーを作成
            $userProperties = [
                'email' => $data['email'],
                'emailVerified' => false,
                'password' => $data['password'],
                'displayName' => $data['nickname'] ?? $data['real_name'],
                'disabled' => false,
            ];

            $createdUser = $auth->createUser($userProperties);

            // 3. 取得したUIDをデータに追加 (これでエラーが消えます！)
            $data['firebase_uid'] = $createdUser->uid;

        } catch (EmailExists $e) {
            // すでにFirebaseにいる場合は、そのUIDを使って続行（またはエラーにする）
            // 今回は親切に「既存のUID」を取得して紐付けるようにします
            $existingUser = $auth->getUserByEmail($data['email']);
            $data['firebase_uid'] = $existingUser->uid;
            
        } catch (\Throwable $e) {
            // その他のエラー（パスワードが短い、通信エラーなど）
            Log::error('Firebase作成エラー: ' . $e->getMessage());
            
            // 画面にエラーメッセージを出して止める
            throw ValidationException::withMessages([
                'email' => 'Firebaseアカウントの作成に失敗しました: ' . $e->getMessage(),
            ]);
        }

        return $data;
    }
}