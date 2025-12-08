<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Filament\Resources\UserResource\RelationManagers;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    // メニュー名は動的に変更
    public static function getNavigationLabel(): string
    {
        return auth()->user()?->role === 'artist' 
            ? 'プロフィール設定' 
            : 'ユーザー・アーティスト管理';
    }

    public static function getModelLabel(): string
    {
        return auth()->user()?->role === 'artist' ? 'プロフィール' : 'ユーザー';
    }

    protected static ?string $navigationGroup = 'ユーザー管理';
    protected static ?int $navigationSort = 1;

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();

        if (auth()->user()->role === 'admin') {
            return $query;
        }

        return $query->where('id', auth()->id());
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('基本情報')
                    ->schema([
                        // ▼▼▼ 追加: アイコン画像設定 ▼▼▼
                        Forms\Components\FileUpload::make('image_url')
                            ->label('アイコン画像')
                            ->image()
                            ->avatar() // 丸く表示
                            ->directory('avatars') // 保存先フォルダ
                            ->disk('public')
                            ->visibility('public')
                            // 画像を中央に配置
                            ->columnSpanFull()
                            ->alignCenter()
                            // 既存のURL文字列を配列に変換して読み込む処理
                            ->formatStateUsing(function ($record) {
                                if (!$record || !$record->getRawOriginal('image_url')) {
                                    return [];
                                }
                                $url = $record->getRawOriginal('image_url');
                                // 外部URL(http〜)の場合は表示できないため空配列を返す
                                if (str_starts_with($url, 'http')) {
                                    return [];
                                }
                                return [$url];
                            }),
                        // ▲▲▲ ここまで ▲▲▲

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

                        Forms\Components\Select::make('role')
                            ->label('権限')
                            ->options([
                                'artist' => 'アーティスト (Artist)',
                                'admin'  => '管理者 (Admin)',
                                'user'   => '一般ユーザー (User)',
                            ])
                            ->required()
                            ->default('artist')
                            ->disabled(fn () => auth()->user()->role !== 'admin')
                            ->dehydrated(),

                        Forms\Components\TextInput::make('password')
                            ->password()
                            ->dehydrated(fn ($state) => filled($state))
                            ->required(fn (string $context): bool => $context === 'create'),
                    ])->columns(2),

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
                // ▼▼▼ 追加: 一覧にアイコンを表示 ▼▼▼
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('アイコン')
                    ->circular(), // 丸く表示
                // ▲▲▲ ここまで ▲▲▲

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
                    ->color(fn (string $state): string => match ($state) {
                        'admin' => 'danger',
                        'artist' => 'success',
                        'user' => 'gray',
                        default => 'gray',
                    }),
            ])
            ->filters([
                // 修正: Roleフィルタは管理者のみ表示
                ...(auth()->user()->role === 'admin' ? [
                     Tables\Filters\SelectFilter::make('role')
                        ->options([
                            'artist' => 'アーティスト',
                            'admin' => '管理者',
                            'user' => '一般ユーザー',
                        ]),
                ] : []),
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