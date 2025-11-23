<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PostFactory extends Factory
{
    public function definition(): array
    {
        // タイトルと本文のペア
        $posts = [
            [
                'title' => '【重要】チケット先行抽選について',
                'content' => "いつも応援ありがとうございます。\n次回のライブチケットの先行抽選受付を明日10:00より開始します。\n\nお申し込みはお早めに！"
            ],
            [
                'title' => 'グッズラインナップ公開！',
                'content' => "今回のツアーグッズがついに完成しました！\n定番のTシャツから、ちょっと変わったアイテムまで。\n\n詳細はグッズページをご覧ください。"
            ],
            [
                'title' => 'ツアーの開催が決定しました',
                'content' => "お待たせしました！全国5都市を回るツアーの開催が決定しました。\n皆さんに会えるのを楽しみにしています！"
            ],
            [
                'title' => '【御礼】福岡公演ありがとうございました',
                'content' => "福岡公演、最高に盛り上がりました！\n来てくれた皆さん、本当にありがとうございました。\n\n次は大阪でお会いしましょう！"
            ],
            [
                'title' => '新曲リリースのお知らせ',
                'content' => "ニューシングル「Future」が配信開始されました！\nライブでも披露する予定なので、ぜひ聴いて予習してきてくださいね。"
            ],
        ];

        // ランダムに1セット選ぶ
        $post = $this->faker->randomElement($posts);

        return [
            'title' => $post['title'],
            'content' => $post['content'],
            'image_url' => null,
            'publish_at' => now(),
            'expires_at' => null,
        ];
    }
}
