<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class PostController extends Controller
{
    /**
     * 投稿一覧 (タイムライン)
     * 修正: 他人の投稿には日時制限をかけ、自分の投稿は無条件で表示する
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // フォロー中のユーザーID + 自分 (※自分のIDは念のため含めておくが、クエリで別途OR条件を入れるため重複しても問題なし)
        $followingArtistIds = $user->following()->pluck('id');
        $followingArtistIds->push($user->id);

        $adminIds = User::where('role', 'admin')->pluck('id');

        // 現在の日時 (JST)
        $now = Carbon::now();

        $posts = Post::with('user')
            // ★ 論理グループ化: (他人の条件 AND 日時制限) OR (自分の条件)
            ->where(function ($query) use ($followingArtistIds, $adminIds, $now, $user) {

                // --- グループA: 他人 (フォロー中 or 管理者) は日時制限を守る ---
                $query->where(function ($q) use ($followingArtistIds, $adminIds, $now) {

                    // A-1: ユーザー対象 (フォロー中 または 管理者)
                    $q->where(function ($target) use ($followingArtistIds, $adminIds) {
                        $target->whereIn('user_id', $followingArtistIds)
                            ->orWhereIn('user_id', $adminIds);
                    });

                    // A-2: 日時制限 (公開中のみ)
                    $q->where(function ($time) use ($now) {
                        // 公開開始: 設定なし(即時) or 過去
                        $time->where(function ($pub) use ($now) {
                            $pub->whereNull('publish_at')
                                ->orWhere('publish_at', '<=', $now);
                        });
                        // 公開終了: 設定なし(無期限) or 未来
                        $time->where(function ($exp) use ($now) {
                            $exp->whereNull('expires_at')
                                ->orWhere('expires_at', '>', $now);
                        });
                    });
                })

                    // --- グループB: 自分 (プレビュー用) は無条件 ---
                    // ※ ここで自分のIDを指定することで、日時に関わらず自分の投稿は必ず取得される
                    ->orWhere('user_id', $user->id);
            })
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
            'title'      => 'required|string|max:255',
            'content'    => 'required|string|max:1000',
            'image_url'  => 'nullable|string|url',
            'publish_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:publish_at',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

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
     */
    public function update(Request $request, Post $post)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->id !== $post->user_id && $user->role !== 'admin') {
            return response()->json(['message' => '権限がありません'], 403);
        }

        $validated = $request->validate([
            'title'      => 'required|string|max:255',
            'content'    => 'required|string|max:1000',
            'image_url'  => 'nullable|string|url',
            'publish_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:publish_at',
        ]);

        $post->update($validated);

        return response()->json($post->load('user'));
    }

    /**
     * 投稿を削除
     */
    public function destroy(Post $post)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->id !== $post->user_id && $user->role !== 'admin') {
            return response()->json(['message' => 'この投稿を削除する権限がありません'], 403);
        }

        $post->delete();

        return response()->json(null, 204);
    }
}
