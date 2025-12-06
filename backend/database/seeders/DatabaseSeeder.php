<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Event;
use App\Models\TicketType;
use App\Models\Post;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Kreait\Firebase\Exception\Auth\EmailExists;
use Kreait\Firebase\Exception\Auth\UserNotFound;

class DatabaseSeeder extends Seeder
{
    protected $auth;

    public function __construct(FirebaseAuth $auth)
    {
        $this->auth = $auth;
    }

    public function run(): void
    {
        $password = 'password';

        // =========================================================
        // 🧹 0. Firebase 大掃除 (Mass Extinction)
        // =========================================================
        // 今回作成する予定のメールアドレスを全てリストアップ
        $emailsToClean = [
            'admin@nokku.com',
            'user@nokku.com',
            'artist@nokku.com',
        ];
        // ランダムアーティストの分も追加
        for ($i = 1; $i <= 10; $i++) {
            $emailsToClean[] = "artist{$i}@test.com";
        }

        $this->command->info("🧹 Cleaning up Firebase users...");
        foreach ($emailsToClean as $email) {
            try {
                $user = $this->auth->getUserByEmail($email);
                $this->auth->deleteUser($user->uid);
                // $this->command->info("Deleted: {$email}");
            } catch (UserNotFound $e) {
                // いなければ何もしない（正常）
            } catch (\Throwable $e) {
                $this->command->warn("Failed to delete {$email}: " . $e->getMessage());
            }
        }
        $this->command->info("✨ Firebase cleanup completed.");


        // =========================================================
        // 1. 固定ユーザー作成
        // =========================================================
        $this->createAccount(
            'admin@nokku.com',
            $password,
            'NOKKU Admin',
            'admin',
            null,
            'https://i.pravatar.cc/150?u=admin@nokku.com'
        );

        $this->createAccount(
            'user@nokku.com',
            $password,
            '一般 太郎',
            'user',
            '一般ユーザー',
            'https://i.pravatar.cc/150?u=user@nokku.com'
        );

        // ★ テスト用メインアーティスト
        $mainArtist = $this->createAccount(
            'artist@nokku.com',
            $password,
            '手巣戸 亜手須斗',
            'artist',
            'テストアーティスト',
            'https://i.pravatar.cc/150?u=artist@nokku.com'
        );

        // =========================================================
        // 4. メインアーティストのイベント (固定データ)
        // =========================================================
        if ($mainArtist) {
            $event = Event::firstOrCreate(
                ['title' => 'NOKKU SPECIAL LIVE'],
                [
                    'description' => 'NOKKUアプリのローンチを記念した特別なライブイベントです。',
                    'venue' => 'Zepp Fukuoka',
                    'event_date' => '2025-12-24 18:00:00',
                    'artist_id' => $mainArtist->id,
                    'image_url' => 'https://picsum.photos/800/600?random=9999',
                ]
            );

            if ($event->wasRecentlyCreated) {
                TicketType::create(['event_id' => $event->id, 'name' => 'S席', 'price' => 8000, 'capacity' => 100, 'seating_type' => 'random']);
                TicketType::create(['event_id' => $event->id, 'name' => 'A席', 'price' => 6000, 'capacity' => 300, 'seating_type' => 'random']);
                TicketType::create(['event_id' => $event->id, 'name' => '自由席', 'price' => 4000, 'capacity' => 500, 'seating_type' => 'free']);
            }
            $this->command->info("Main Event created.");
        }

        // =========================================================
        // 5. ランダムアーティスト 10人 & コンテンツ作成
        // =========================================================
        for ($i = 1; $i <= 10; $i++) {
            $artist = $this->createAccount(
                "artist{$i}@test.com",
                $password,
                "Artist No.{$i}",
                'artist',
                "Artist No.{$i}",
                "https://i.pravatar.cc/150?u=artist{$i}@test.com"
            );

            // A. イベント作成
            $events = Event::factory(rand(1, 2))->create([
                'artist_id' => $artist->id,
            ]);

            foreach ($events as $ev) {
                $ticketTemplates = collect([
                    ['name' => 'VIP席', 'base_price' => 15000, 'capacity' => 50, 'type' => 'random'],
                    ['name' => 'SS席',  'base_price' => 10000, 'capacity' => 100, 'type' => 'random'],
                    ['name' => 'S席',   'base_price' => 8000,  'capacity' => 200, 'type' => 'random'],
                    ['name' => 'A席',   'base_price' => 6000,  'capacity' => 300, 'type' => 'random'],
                    ['name' => '一般',  'base_price' => 4000,  'capacity' => 500, 'type' => 'free'],
                ]);

                $selectedTickets = $ticketTemplates->random(rand(1, 3))->sortByDesc('base_price');

                foreach ($selectedTickets as $ticketData) {
                    TicketType::create([
                        'event_id' => $ev->id,
                        'name' => $ticketData['name'],
                        'price' => $ticketData['base_price'] + (rand(-5, 5) * 100),
                        'capacity' => $ticketData['capacity'],
                        'seating_type' => $ticketData['type'],
                    ]);
                }
            }

            // B. グッズ作成
            Product::factory(rand(3, 5))->create([
                'artist_id' => $artist->id,
            ]);

            // C. お知らせ作成
            Post::factory(rand(2, 4))->create([
                'user_id' => $artist->id,
            ]);
        }

        // =========================================================
        // 6. 注文データの生成
        // =========================================================
        $orders = Order::factory()
            ->count(15)
            ->has(OrderItem::factory()->count(rand(1, 4)), 'items')
            ->create();

        // 合計金額の再計算と上書き
        foreach ($orders as $order) {
            $realTotal = $order->items->sum(function ($item) {
                return $item->price_at_purchase * $item->quantity;
            });
            $order->update(['total_price' => $realTotal]);
        }

        $this->command->info("15 Orders created.");
        $this->command->info('🎉 全てのシーディングが完了しました！');
    }

    private function createAccount($email, $password, $realName, $role, $nickname = null, $imageUrl = null)
    {
        $nickname = $nickname ?? $realName;

        // Firebaseユーザー作成 (クリーンアップ済みなので、必ず新規作成される)
        // もし残っていたとしても ensureFirebaseUser ロジックで既存IDを取得する安全策をとります
        $uid = $this->ensureFirebaseUser($email, $password, $nickname);

        // DB保存
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'real_name' => $realName,
                'nickname' => $nickname,
                'password' => Hash::make($password),
                'role' => $role,
                'firebase_uid' => $uid,
                'image_url' => $imageUrl,
                'postal_code' => fake()->postcode(),
                'prefecture' => fake()->prefecture(),
                'city' => fake()->city(),
                'address_line1' => fake()->streetAddress(),
                'address_line2' => fake()->secondaryAddress(),
                'phone_number' => fake()->phoneNumber(),
            ]
        );

        $this->command->info("User prepared: {$email} ({$role})");
        return $user;
    }

    private function ensureFirebaseUser($email, $password, $displayName)
    {
        try {
            $user = $this->auth->createUser([
                'email' => $email,
                'password' => $password,
                'displayName' => $displayName,
                'emailVerified' => true,
            ]);
            return $user->uid;
        } catch (EmailExists $e) {
            // 万が一削除漏れがあっても、既存のUIDを使うのでエラーにはならない
            $user = $this->auth->getUserByEmail($email);
            return $user->uid;
        }
    }
}