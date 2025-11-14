<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller; // 1. Controller を use
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class PostController extends Controller // 2. Controller を extends
{
    /**
     * 投稿一覧 (タイムライン)
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // [・・・(followingArtistIds, adminIds の取得は変更なし)・・・]
        $followingArtistIds = $user->following()->pluck('id');
        $followingArtistIds->push($user->id);
        $adminIds = User::where('role', 'admin')->pluck('id');

        // 2. ★ 現在の日時を取得 (JST, タイムゾーン修正済み)
        $now = Carbon::now();

        // 5. ★ 投稿を検索
        $posts = Post::with('user')

            // --- フィルター条件 (AND) ---
            ->where(function ($query) use ($followingArtistIds, $adminIds) {
                // 条件A: 投稿者が「フォロー中 (または自分)」
                $query->whereIn('user_id', $followingArtistIds)
                    // 条件B: または、投稿者が「管理者」
                    ->orWhereIn('user_id', $adminIds);
            })

            // 3. ★ (NEW) 「公開日時」の条件
            // 'publish_at' が NULL (即時公開)
            ->where(function ($query) use ($now) {
                $query->whereNull('publish_at')
                    // または 'publish_at' が過去 (公開済み)
                    ->orWhere('publish_at', '<=', $now);
            })

            // 4. ★ (NEW) 「有効期限」の条件
            // 'expires_at' が NULL (無期限)
            ->where(function ($query) use ($now) {
                $query->whereNull('expires_at')
                    // または 'expires_at' が未来 (まだ有効)
                    ->orWhere('expires_at', '>', $now);
            })
            // --- フィルター条件ここまで ---

            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($posts);
    }

    /**
     * 新規投稿
     */
    public function store(Request $request)
    {
        // 5. ★ バリデーションに日付項目を追加
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:1000',
            'image_url' => 'nullable|string|url',
            'publish_at' => 'nullable|date', // (例: "2025-11-15 20:00:00")
            'expires_at' => 'nullable|date|after_or_equal:publish_at', // 期限は公開日時以降
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 6. ★ create に日付項目を追加
        $post = $user->posts()->create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'image_url' => $validated['image_url'] ?? null,
            'publish_at' => $validated['publish_at'] ?? null,
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        return response()->json($post->load('user'), 201);
    }

    public function show(Post $post)
    {
        // 投稿者情報も一緒に返す
        return response()->json($post->load('user'));
    }

    /**
     * 2. 投稿を更新 (update)
     */
    public function update(Request $request, Post $post)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // [・・・(権限チェックは変更なし)・・・]
        if ($user->id !== $post->user_id && $user->role !== 'admin') {
            // ...
        }

        // 7. ★ バリデーション (store と同じ)
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:1000',
            'image_url' => 'nullable|string|url',
            'publish_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:publish_at',
        ]);

        // 更新
        $post->update($validated);

        // 更新後のデータを返す
        return response()->json($post->load('user'));
    }

    /**
     * 3. 投稿を削除 (destroy)
     */
    public function destroy(Post $post)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 権限チェック: 投稿者本人 または 管理者 か？
        if ($user->id !== $post->user_id && $user->role !== 'admin') {
            return response()->json(['message' => 'この投稿を削除する権限がありません'], 403);
        }

        // DBレコードを削除
        $post->delete();

        // (前述の通り、このロジックでは ImageUploadController で
        // アップロードされたファイル本体を Storage から削除することはできません)

        // 成功（コンテンツなし）
        return response()->json(null, 204);
    }
}