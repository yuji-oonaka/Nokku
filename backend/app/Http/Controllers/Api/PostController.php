<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller; // 1. Controller を use
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PostController extends Controller // 2. Controller を extends
{
    /**
     * 投稿一覧 (タイムライン)
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        // 1. ログイン中のユーザーを取得
        $user = Auth::user();

        // 2. ユーザーがフォローしているアーティストのIDリストを取得
        $followingArtistIds = $user->following()->pluck('id');

        // 3. 自分のIDもリストに追加 (自分の投稿も表示するため)
        $followingArtistIds->push($user->id);

        // 4. すべての「管理者」のIDリストを取得
        $adminIds = User::where('role', 'admin')->pluck('id');

        // 5. ★ 投稿を検索
        $posts = Post::with('user')
            // 条件A: 投稿者が「フォロー中 (または自分)」である
            ->whereIn('user_id', $followingArtistIds)
            
            // ★ 条件B: または、投稿者が「管理者」である
            ->orWhereIn('user_id', $adminIds)
            
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($posts);
    }

    /**
     * 新規投稿
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:1000',
            'image_url' => 'nullable|string|url',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $post = $user->posts()->create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'image_url' => $validated['image_url'] ?? null,
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

        // 権限チェック: 投稿者本人 または 管理者 か？
        if ($user->id !== $post->user_id && $user->role !== 'admin') {
            return response()->json(['message' => 'この投稿を編集する権限がありません'], 403);
        }

        // バリデーション (store と同じ)
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:1000',
            'image_url' => 'nullable|string|url', // URLを受け取る
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