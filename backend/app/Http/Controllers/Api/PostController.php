<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use App\Http\Requests\Post\StorePostRequest;   // 追加: 新規投稿用リクエスト
use App\Http\Requests\Post\UpdatePostRequest; // 追加: 更新用リクエスト

class PostController extends Controller
{
    /**
     * 投稿一覧 (タイムライン)
     * ※ ロジックは変更せずそのまま維持
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $followingArtistIds = $user->following()->pluck('id');
        $followingArtistIds->push($user->id);

        $adminIds = User::where('role', 'admin')->pluck('id');
        $now = Carbon::now();

        $posts = Post::with('user')
            ->where(function ($query) use ($followingArtistIds, $adminIds, $now, $user) {
                // グループA: 他人 (フォロー中 or 管理者) は日時制限を守る
                $query->where(function ($q) use ($followingArtistIds, $adminIds, $now) {
                    $q->where(function ($target) use ($followingArtistIds, $adminIds) {
                        $target->whereIn('user_id', $followingArtistIds)
                            ->orWhereIn('user_id', $adminIds);
                    });
                    $q->where(function ($time) use ($now) {
                        $time->where(function ($pub) use ($now) {
                            $pub->whereNull('publish_at')->orWhere('publish_at', '<=', $now);
                        });
                        $time->where(function ($exp) use ($now) {
                            $exp->whereNull('expires_at')->orWhere('expires_at', '>', $now);
                        });
                    });
                })
                    // グループB: 自分は無条件
                    ->orWhere('user_id', $user->id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($posts);
    }

    /**
     * 新規投稿
     * バリデーションは StorePostRequest に分離済み
     */
    public function store(StorePostRequest $request)
    {
        // 1. バリデーション済みデータを取得
        $validated = $request->validated();

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 2. データ保存
        $post = $user->posts()->create([
            'title'      => $validated['title'],
            'content'    => $validated['content'],
            'image_url'  => $validated['image_url'] ?? null,
            'publish_at' => $validated['publish_at'] ?? null,
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        return response()->json($post->load('user'), 201);
    }

    /**
     * 詳細表示
     */
    public function show(Post $post)
    {
        return response()->json($post->load('user'));
    }

    /**
     * 投稿を更新
     * バリデーションは UpdatePostRequest に分離済み
     */
    public function update(UpdatePostRequest $request, Post $post)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 権限チェック (簡易版: 将来Policyへ移行推奨)
        if ($user->id !== $post->user_id && $user->role !== 'admin') {
            return response()->json(['message' => '権限がありません'], 403);
        }

        // 更新実行
        $post->update($request->validated());

        return response()->json($post->load('user'));
    }

    /**
     * 投稿を削除
     */
    public function destroy(Post $post)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 権限チェック
        if ($user->id !== $post->user_id && $user->role !== 'admin') {
            return response()->json(['message' => 'この投稿を削除する権限がありません'], 403);
        }

        $post->delete();

        return response()->json(null, 204);
    }
}
