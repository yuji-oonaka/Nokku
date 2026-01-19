<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth; // Facadeを使用

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    protected static ?string $navigationLabel = 'ユーザー・アーティスト管理';

    // ★重要: 表示データの制限ロジック (ArtistもStaffを見れるように緩和)
    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        $user = Auth::user();

        // 1. 管理者(admin)は全員表示
        if ($user->role === 'admin') {
            return $query;
        }

        // 2. アーティスト(artist)は「自分」と「自分が雇ったスタッフ」のみ表示
        if ($user->role === 'artist') {
            return $query->where(function ($q) use ($user) {
                $q->where('id', $user->id)                 // 自分自身
                    ->orWhere('employer_id', $user->id);     // ★修正: 自分のスタッフ
            });
        }

        // 3. その他は自分のみ
        return $query->where('id', $user->id);
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // ▼▼▼ 基本情報セクション ▼▼▼
                Forms\Components\Section::make('基本情報')
                    ->schema([
                        Forms\Components\TextInput::make('real_name')
                            ->label('本名')
                            ->maxLength(255),

                        Forms\Components\TextInput::make('nickname')
                            ->label('アーティスト名 / ニックネーム')
                            ->maxLength(255),

                        Forms\Components\TextInput::make('email')
                            ->email()
                            ->required()
                            ->maxLength(255),

                        // ★重要: ロール選択肢の動的制御
                        Forms\Components\Select::make('role')
                            ->label('権限')
                            ->options(function () {
                                // Adminは全権限を選択可能
                                if (Auth::user()->role === 'admin') {
                                    return [
                                        'artist' => 'アーティスト (Artist)',
                                        'admin'  => '管理者 (Admin)',
                                        'staff'  => '運営スタッフ (Staff)',
                                        'operator' => 'Operator (オペレーター)',
                                        'user'   => '一般ユーザー (User)',
                                    ];
                                }
                                // ArtistはStaffのみ作成可能
                                if (Auth::user()->role === 'artist') {
                                    return [
                                        'staff'  => '運営スタッフ (Staff)',
                                    ];
                                }
                                return [];
                            })
                            ->required()
                            // 初期値も権限に合わせて変更
                            ->default(fn() => Auth::user()->role === 'artist' ? 'staff' : 'artist')
                            // AdminとArtist以外は変更不可
                            ->disabled(fn() => !in_array(Auth::user()->role, ['admin', 'artist']))
                            ->dehydrated()
                            ->selectablePlaceholder(false), // 空選択を防止

                        Forms\Components\TextInput::make('password')
                            ->password()
                            ->dehydrated(fn($state) => filled($state))
                            ->required(fn(string $context): bool => $context === 'create'),
                    ])->columns(2),

                // ▼▼▼ プロフィール設定 (画像・自己紹介) ▼▼▼
                Forms\Components\Section::make('プロフィール設定')
                    ->description('アプリ内で表示される情報です。スタッフの場合は本人の顔写真を登録してください。')
                    ->schema([
                        Forms\Components\FileUpload::make('image_url')
                            ->label('プロフィール画像 / 顔写真')
                            ->disk('public')
                            ->directory('users/avatars')
                            ->image()
                            ->avatar()
                            ->imageEditor()
                            ->maxSize(5120),

                        Forms\Components\Textarea::make('bio')
                            ->label('自己紹介')
                            ->rows(3)
                            ->maxLength(500),
                    ]),

                // ▼▼▼ 住所・連絡先セクション ▼▼▼
                Forms\Components\Section::make('住所・連絡先')
                    ->schema([
                        Forms\Components\TextInput::make('phone_number')
                            ->label('電話番号')
                            ->tel()
                            ->maxLength(20),

                        Forms\Components\TextInput::make('postal_code')
                            ->label('郵便番号')
                            ->numeric()
                            ->maxLength(8),

                        Forms\Components\TextInput::make('prefecture')
                            ->label('都道府県')
                            ->maxLength(255),

                        Forms\Components\TextInput::make('city')
                            ->label('市区町村')
                            ->maxLength(255),

                        Forms\Components\TextInput::make('address_line1')
                            ->label('番地など')
                            ->maxLength(255)
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('address_line2')
                            ->label('建物名・部屋番号')
                            ->maxLength(255)
                            ->columnSpanFull(),
                    ])->columns(3),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('アイコン')
                    ->disk('public')
                    ->circular(),

                Tables\Columns\TextColumn::make('real_name')
                    ->label('本名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('nickname')
                    ->label('アーティスト名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('email')
                    ->searchable(),

                Tables\Columns\TextColumn::make('role')
                    ->label('権限')
                    ->badge()
                    ->color(fn(string $state): string => match ($state) {
                        'admin'  => 'danger',
                        'artist' => 'success',
                        'staff'  => 'info',
                        'user'   => 'gray',
                        default  => 'gray',
                    }),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role')
                    ->options([
                        'artist' => 'アーティスト',
                        'admin'  => '管理者',
                        'staff'  => '運営スタッフ',
                        'user'   => '一般ユーザー',
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
