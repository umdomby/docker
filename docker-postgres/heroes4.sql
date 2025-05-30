PGDMP  2                    }            neondb    15.12    17.4 K              0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false                       0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false                       0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false                       1262    16386    neondb    DATABASE     n   CREATE DATABASE neondb WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C.UTF-8';
    DROP DATABASE neondb;
                     neondb_owner    false                       0    0    DATABASE neondb    ACL     0   GRANT ALL ON DATABASE neondb TO neon_superuser;
                        neondb_owner    false    3868                        2615    2200    public    SCHEMA        CREATE SCHEMA public;
    DROP SCHEMA public;
                     pg_database_owner    false                       0    0    SCHEMA public    COMMENT     6   COMMENT ON SCHEMA public IS 'standard public schema';
                        pg_database_owner    false    5                       0    0    SCHEMA public    ACL     +   REVOKE USAGE ON SCHEMA public FROM PUBLIC;
                        pg_database_owner    false    5            �           1247    24586 	   BetStatus    TYPE     u   CREATE TYPE public."BetStatus" AS ENUM (
    'OPEN',
    'OPEN_USER',
    'OPEN_TUR',
    'CLOSED',
    'PENDING'
);
    DROP TYPE public."BetStatus";
       public               neondb_owner    false    5            �           1247    24616    BuySell    TYPE     @   CREATE TYPE public."BuySell" AS ENUM (
    'BUY',
    'SELL'
);
    DROP TYPE public."BuySell";
       public               neondb_owner    false    5            �           1247    57376 
   CityHeroes    TYPE     �   CREATE TYPE public."CityHeroes" AS ENUM (
    'CASTLE',
    'RAMPART',
    'TOWER',
    'INFERNO',
    'NECROPOLIS',
    'DUNGEON',
    'STRONGHOLD',
    'FORTRESS',
    'CONFLUX',
    'COVE',
    'FACTORY'
);
    DROP TYPE public."CityHeroes";
       public               neondb_owner    false    5            �           1247    57400    ColorPlayer    TYPE     �   CREATE TYPE public."ColorPlayer" AS ENUM (
    'RED',
    'BLUE',
    'GREEN',
    'YELLOW',
    'PURPLE',
    'ORANGE',
    'TEAL',
    'PINK'
);
     DROP TYPE public."ColorPlayer";
       public               neondb_owner    false    5            �           1247    24658    GameUserBetStatus    TYPE     Z   CREATE TYPE public."GameUserBetStatus" AS ENUM (
    'OPEN',
    'START',
    'CLOSED'
);
 &   DROP TYPE public."GameUserBetStatus";
       public               neondb_owner    false    5            �           1247    24608 	   IsCovered    TYPE     T   CREATE TYPE public."IsCovered" AS ENUM (
    'OPEN',
    'CLOSED',
    'PENDING'
);
    DROP TYPE public."IsCovered";
       public               neondb_owner    false    5            �           1247    24622    OrderP2PStatus    TYPE     v   CREATE TYPE public."OrderP2PStatus" AS ENUM (
    'OPEN',
    'PENDING',
    'CLOSED',
    'RETURN',
    'CONTROL'
);
 #   DROP TYPE public."OrderP2PStatus";
       public               neondb_owner    false    5            �           1247    24634    PlayerChoice    TYPE     j   CREATE TYPE public."PlayerChoice" AS ENUM (
    'PLAYER1',
    'PLAYER2',
    'PLAYER3',
    'PLAYER4'
);
 !   DROP TYPE public."PlayerChoice";
       public               neondb_owner    false    5            �           1247    24644    RatingUserEnum    TYPE     I   CREATE TYPE public."RatingUserEnum" AS ENUM (
    'PLUS',
    'MINUS'
);
 #   DROP TYPE public."RatingUserEnum";
       public               neondb_owner    false    5            �           1247    24577    StatusTurnir    TYPE     u   CREATE TYPE public."StatusTurnir" AS ENUM (
    'REGISTRATION',
    'REGISTRATION_OFF',
    'START',
    'CLOSED'
);
 !   DROP TYPE public."StatusTurnir";
       public               neondb_owner    false    5            �           1247    24598    UserRole    TYPE     q   CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'USER_BET',
    'ADMIN',
    'BANED',
    'USER_EDIT'
);
    DROP TYPE public."UserRole";
       public               neondb_owner    false    5            �           1247    24650    WinGameUserBet    TYPE     S   CREATE TYPE public."WinGameUserBet" AS ENUM (
    'WIN',
    'LOSS',
    'DRAW'
);
 #   DROP TYPE public."WinGameUserBet";
       public               neondb_owner    false    5            �           1247    57418 
   cityheroes    TYPE     �   CREATE TYPE public.cityheroes AS ENUM (
    'CASTLE',
    'RAMPART',
    'TOWER',
    'INFERNO',
    'NECROPOLIS',
    'DUNGEON',
    'STRONGHOLD',
    'FORTRESS',
    'CONFLUX',
    'COVE',
    'FACTORY'
);
    DROP TYPE public.cityheroes;
       public               neondb_owner    false    5            �           1247    57442    colorplayer    TYPE     �   CREATE TYPE public.colorplayer AS ENUM (
    'RED',
    'BLUE',
    'GREEN',
    'YELLOW',
    'PURPLE',
    'ORANGE',
    'TEAL',
    'PINK'
);
    DROP TYPE public.colorplayer;
       public               neondb_owner    false    5            �            1259    57459    Bet    TABLE     �  CREATE TABLE public."Bet" (
    id integer NOT NULL,
    "player1Id" integer NOT NULL,
    "player2Id" integer NOT NULL,
    "initBetPlayer1" double precision NOT NULL,
    "initBetPlayer2" double precision NOT NULL,
    "totalBetPlayer1" double precision NOT NULL,
    "totalBetPlayer2" double precision NOT NULL,
    "oddsBetPlayer1" double precision NOT NULL,
    "oddsBetPlayer2" double precision NOT NULL,
    "maxBetPlayer1" double precision NOT NULL,
    "maxBetPlayer2" double precision NOT NULL,
    "overlapPlayer1" double precision NOT NULL,
    "overlapPlayer2" double precision NOT NULL,
    margin double precision,
    "totalBetAmount" double precision DEFAULT 0 NOT NULL,
    "creatorId" integer NOT NULL,
    status public."BetStatus" DEFAULT 'OPEN'::public."BetStatus" NOT NULL,
    "categoryId" integer,
    "productId" integer,
    "productItemId" integer,
    "winnerId" integer,
    "suspendedBet" boolean DEFAULT false NOT NULL,
    description text,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "turnirBetId" integer
);
    DROP TABLE public."Bet";
       public         heap r       neondb_owner    false    902    902    5            �            1259    57469    Bet3    TABLE     #  CREATE TABLE public."Bet3" (
    id integer NOT NULL,
    "player1Id" integer NOT NULL,
    "player2Id" integer NOT NULL,
    "player3Id" integer NOT NULL,
    "initBetPlayer1" double precision NOT NULL,
    "initBetPlayer2" double precision NOT NULL,
    "initBetPlayer3" double precision NOT NULL,
    "totalBetPlayer1" double precision NOT NULL,
    "totalBetPlayer2" double precision NOT NULL,
    "totalBetPlayer3" double precision NOT NULL,
    "oddsBetPlayer1" double precision NOT NULL,
    "oddsBetPlayer2" double precision NOT NULL,
    "oddsBetPlayer3" double precision NOT NULL,
    "maxBetPlayer1" double precision NOT NULL,
    "maxBetPlayer2" double precision NOT NULL,
    "maxBetPlayer3" double precision NOT NULL,
    "overlapPlayer1" double precision NOT NULL,
    "overlapPlayer2" double precision NOT NULL,
    "overlapPlayer3" double precision NOT NULL,
    margin double precision,
    "totalBetAmount" double precision DEFAULT 0 NOT NULL,
    "creatorId" integer NOT NULL,
    status public."BetStatus" DEFAULT 'OPEN'::public."BetStatus" NOT NULL,
    "categoryId" integer,
    "productId" integer,
    "productItemId" integer,
    "winnerId" integer,
    "suspendedBet" boolean DEFAULT false NOT NULL,
    description text,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "turnirBetId" integer,
    "betP1" boolean DEFAULT true,
    "betP2" boolean DEFAULT true,
    "betP3" boolean DEFAULT true
);
    DROP TABLE public."Bet3";
       public         heap r       neondb_owner    false    902    5    902            �            1259    57479    Bet3_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Bet3_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public."Bet3_id_seq";
       public               neondb_owner    false    215    5                        0    0    Bet3_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public."Bet3_id_seq" OWNED BY public."Bet3".id;
          public               neondb_owner    false    216            �            1259    57480    Bet4    TABLE     W  CREATE TABLE public."Bet4" (
    id integer NOT NULL,
    "player1Id" integer NOT NULL,
    "player2Id" integer NOT NULL,
    "player3Id" integer NOT NULL,
    "player4Id" integer NOT NULL,
    "initBetPlayer1" double precision NOT NULL,
    "initBetPlayer2" double precision NOT NULL,
    "initBetPlayer3" double precision NOT NULL,
    "initBetPlayer4" double precision NOT NULL,
    "totalBetPlayer1" double precision NOT NULL,
    "totalBetPlayer2" double precision NOT NULL,
    "totalBetPlayer3" double precision NOT NULL,
    "totalBetPlayer4" double precision NOT NULL,
    "oddsBetPlayer1" double precision NOT NULL,
    "oddsBetPlayer2" double precision NOT NULL,
    "oddsBetPlayer3" double precision NOT NULL,
    "oddsBetPlayer4" double precision NOT NULL,
    "maxBetPlayer1" double precision NOT NULL,
    "maxBetPlayer2" double precision NOT NULL,
    "maxBetPlayer3" double precision NOT NULL,
    "maxBetPlayer4" double precision NOT NULL,
    "overlapPlayer1" double precision NOT NULL,
    "overlapPlayer2" double precision NOT NULL,
    "overlapPlayer3" double precision NOT NULL,
    "overlapPlayer4" double precision NOT NULL,
    margin double precision,
    "totalBetAmount" double precision DEFAULT 0 NOT NULL,
    "creatorId" integer NOT NULL,
    status public."BetStatus" DEFAULT 'OPEN'::public."BetStatus" NOT NULL,
    "categoryId" integer,
    "productId" integer,
    "productItemId" integer,
    "winnerId" integer,
    "suspendedBet" boolean DEFAULT false NOT NULL,
    description text,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "turnirBetId" integer,
    "betP1" boolean DEFAULT true,
    "betP2" boolean DEFAULT true,
    "betP3" boolean DEFAULT true,
    "betP4" boolean DEFAULT true
);
    DROP TABLE public."Bet4";
       public         heap r       neondb_owner    false    902    902    5            �            1259    57490    Bet4_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Bet4_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public."Bet4_id_seq";
       public               neondb_owner    false    217    5            !           0    0    Bet4_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public."Bet4_id_seq" OWNED BY public."Bet4".id;
          public               neondb_owner    false    218            �            1259    57491 	   BetCLOSED    TABLE     �  CREATE TABLE public."BetCLOSED" (
    id integer NOT NULL,
    "player1Id" integer NOT NULL,
    "player2Id" integer NOT NULL,
    "totalBetAmount" double precision DEFAULT 0 NOT NULL,
    "returnBetAmount" double precision DEFAULT 0 NOT NULL,
    "globalDataBetFund" double precision DEFAULT 0 NOT NULL,
    "initBetPlayer1" double precision NOT NULL,
    "initBetPlayer2" double precision NOT NULL,
    "totalBetPlayer1" double precision NOT NULL,
    "totalBetPlayer2" double precision NOT NULL,
    "oddsBetPlayer1" double precision NOT NULL,
    "oddsBetPlayer2" double precision NOT NULL,
    "maxBetPlayer1" double precision NOT NULL,
    "maxBetPlayer2" double precision NOT NULL,
    "overlapPlayer1" double precision NOT NULL,
    "overlapPlayer2" double precision NOT NULL,
    margin double precision,
    "creatorId" integer NOT NULL,
    status public."BetStatus" DEFAULT 'CLOSED'::public."BetStatus" NOT NULL,
    "categoryId" integer,
    "productId" integer,
    "productItemId" integer,
    "winnerId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "turnirBetId" integer
);
    DROP TABLE public."BetCLOSED";
       public         heap r       neondb_owner    false    902    902    5            �            1259    57499 
   BetCLOSED3    TABLE     �  CREATE TABLE public."BetCLOSED3" (
    id integer NOT NULL,
    "player1Id" integer NOT NULL,
    "player2Id" integer NOT NULL,
    "player3Id" integer NOT NULL,
    "totalBetAmount" double precision DEFAULT 0 NOT NULL,
    "returnBetAmount" double precision DEFAULT 0 NOT NULL,
    "globalDataBetFund" double precision DEFAULT 0 NOT NULL,
    "initBetPlayer1" double precision NOT NULL,
    "initBetPlayer2" double precision NOT NULL,
    "initBetPlayer3" double precision NOT NULL,
    "totalBetPlayer1" double precision NOT NULL,
    "totalBetPlayer2" double precision NOT NULL,
    "totalBetPlayer3" double precision NOT NULL,
    "oddsBetPlayer1" double precision NOT NULL,
    "oddsBetPlayer2" double precision NOT NULL,
    "oddsBetPlayer3" double precision NOT NULL,
    "maxBetPlayer1" double precision NOT NULL,
    "maxBetPlayer2" double precision NOT NULL,
    "maxBetPlayer3" double precision NOT NULL,
    "overlapPlayer1" double precision NOT NULL,
    "overlapPlayer2" double precision NOT NULL,
    "overlapPlayer3" double precision NOT NULL,
    margin double precision,
    "creatorId" integer NOT NULL,
    status public."BetStatus" DEFAULT 'CLOSED'::public."BetStatus" NOT NULL,
    "categoryId" integer,
    "productId" integer,
    "productItemId" integer,
    "winnerId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "turnirBetId" integer
);
     DROP TABLE public."BetCLOSED3";
       public         heap r       neondb_owner    false    902    5    902            �            1259    57507    BetCLOSED3_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetCLOSED3_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public."BetCLOSED3_id_seq";
       public               neondb_owner    false    5    220            "           0    0    BetCLOSED3_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public."BetCLOSED3_id_seq" OWNED BY public."BetCLOSED3".id;
          public               neondb_owner    false    221            �            1259    57508 
   BetCLOSED4    TABLE     �  CREATE TABLE public."BetCLOSED4" (
    id integer NOT NULL,
    "player1Id" integer NOT NULL,
    "player2Id" integer NOT NULL,
    "player3Id" integer NOT NULL,
    "player4Id" integer NOT NULL,
    "totalBetAmount" double precision DEFAULT 0 NOT NULL,
    "returnBetAmount" double precision DEFAULT 0 NOT NULL,
    "globalDataBetFund" double precision DEFAULT 0 NOT NULL,
    "initBetPlayer1" double precision NOT NULL,
    "initBetPlayer2" double precision NOT NULL,
    "initBetPlayer3" double precision NOT NULL,
    "initBetPlayer4" double precision NOT NULL,
    "totalBetPlayer1" double precision NOT NULL,
    "totalBetPlayer2" double precision NOT NULL,
    "totalBetPlayer3" double precision NOT NULL,
    "totalBetPlayer4" double precision NOT NULL,
    "oddsBetPlayer1" double precision NOT NULL,
    "oddsBetPlayer2" double precision NOT NULL,
    "oddsBetPlayer3" double precision NOT NULL,
    "oddsBetPlayer4" double precision NOT NULL,
    "maxBetPlayer1" double precision NOT NULL,
    "maxBetPlayer2" double precision NOT NULL,
    "maxBetPlayer3" double precision NOT NULL,
    "maxBetPlayer4" double precision NOT NULL,
    "overlapPlayer1" double precision NOT NULL,
    "overlapPlayer2" double precision NOT NULL,
    "overlapPlayer3" double precision NOT NULL,
    "overlapPlayer4" double precision NOT NULL,
    margin double precision,
    "creatorId" integer NOT NULL,
    status public."BetStatus" DEFAULT 'CLOSED'::public."BetStatus" NOT NULL,
    "categoryId" integer,
    "productId" integer,
    "productItemId" integer,
    "winnerId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "turnirBetId" integer
);
     DROP TABLE public."BetCLOSED4";
       public         heap r       neondb_owner    false    902    5    902            �            1259    57516    BetCLOSED4_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetCLOSED4_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public."BetCLOSED4_id_seq";
       public               neondb_owner    false    222    5            #           0    0    BetCLOSED4_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public."BetCLOSED4_id_seq" OWNED BY public."BetCLOSED4".id;
          public               neondb_owner    false    223            �            1259    57517    BetCLOSED_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetCLOSED_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public."BetCLOSED_id_seq";
       public               neondb_owner    false    219    5            $           0    0    BetCLOSED_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public."BetCLOSED_id_seq" OWNED BY public."BetCLOSED".id;
          public               neondb_owner    false    224            �            1259    57518    BetParticipant    TABLE     I  CREATE TABLE public."BetParticipant" (
    id integer NOT NULL,
    "betId" integer NOT NULL,
    "userId" integer NOT NULL,
    player public."PlayerChoice" NOT NULL,
    amount double precision NOT NULL,
    odds double precision NOT NULL,
    profit double precision NOT NULL,
    overlap double precision NOT NULL,
    margin double precision NOT NULL,
    "isCovered" public."IsCovered" NOT NULL,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "isWinner" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 $   DROP TABLE public."BetParticipant";
       public         heap r       neondb_owner    false    5    917    908            �            1259    57524    BetParticipant3    TABLE     J  CREATE TABLE public."BetParticipant3" (
    id integer NOT NULL,
    "betId" integer NOT NULL,
    "userId" integer NOT NULL,
    player public."PlayerChoice" NOT NULL,
    amount double precision NOT NULL,
    odds double precision NOT NULL,
    profit double precision NOT NULL,
    overlap double precision NOT NULL,
    margin double precision NOT NULL,
    "isWinner" boolean DEFAULT false NOT NULL,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "isCovered" public."IsCovered" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 %   DROP TABLE public."BetParticipant3";
       public         heap r       neondb_owner    false    908    917    5            �            1259    57530    BetParticipant3_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetParticipant3_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 /   DROP SEQUENCE public."BetParticipant3_id_seq";
       public               neondb_owner    false    226    5            %           0    0    BetParticipant3_id_seq    SEQUENCE OWNED BY     U   ALTER SEQUENCE public."BetParticipant3_id_seq" OWNED BY public."BetParticipant3".id;
          public               neondb_owner    false    227            �            1259    57531    BetParticipant4    TABLE     J  CREATE TABLE public."BetParticipant4" (
    id integer NOT NULL,
    "betId" integer NOT NULL,
    "userId" integer NOT NULL,
    player public."PlayerChoice" NOT NULL,
    amount double precision NOT NULL,
    odds double precision NOT NULL,
    profit double precision NOT NULL,
    overlap double precision NOT NULL,
    margin double precision NOT NULL,
    "isWinner" boolean DEFAULT false NOT NULL,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "isCovered" public."IsCovered" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 %   DROP TABLE public."BetParticipant4";
       public         heap r       neondb_owner    false    917    908    5            �            1259    57537    BetParticipant4_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetParticipant4_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 /   DROP SEQUENCE public."BetParticipant4_id_seq";
       public               neondb_owner    false    5    228            &           0    0    BetParticipant4_id_seq    SEQUENCE OWNED BY     U   ALTER SEQUENCE public."BetParticipant4_id_seq" OWNED BY public."BetParticipant4".id;
          public               neondb_owner    false    229            �            1259    57538    BetParticipantCLOSED    TABLE     H  CREATE TABLE public."BetParticipantCLOSED" (
    id integer NOT NULL,
    "betCLOSEDId" integer NOT NULL,
    "userId" integer NOT NULL,
    player public."PlayerChoice" NOT NULL,
    amount double precision NOT NULL,
    odds double precision NOT NULL,
    profit double precision NOT NULL,
    overlap double precision NOT NULL,
    margin double precision NOT NULL,
    return double precision NOT NULL,
    "isWinner" boolean DEFAULT false NOT NULL,
    "isCovered" public."IsCovered" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 *   DROP TABLE public."BetParticipantCLOSED";
       public         heap r       neondb_owner    false    917    908    5            �            1259    57543    BetParticipantCLOSED3    TABLE     J  CREATE TABLE public."BetParticipantCLOSED3" (
    id integer NOT NULL,
    "betCLOSED3Id" integer NOT NULL,
    "userId" integer NOT NULL,
    player public."PlayerChoice" NOT NULL,
    amount double precision NOT NULL,
    odds double precision NOT NULL,
    profit double precision NOT NULL,
    overlap double precision NOT NULL,
    margin double precision NOT NULL,
    return double precision NOT NULL,
    "isWinner" boolean DEFAULT false NOT NULL,
    "isCovered" public."IsCovered" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 +   DROP TABLE public."BetParticipantCLOSED3";
       public         heap r       neondb_owner    false    917    908    5            �            1259    57548    BetParticipantCLOSED3_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetParticipantCLOSED3_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 5   DROP SEQUENCE public."BetParticipantCLOSED3_id_seq";
       public               neondb_owner    false    231    5            '           0    0    BetParticipantCLOSED3_id_seq    SEQUENCE OWNED BY     a   ALTER SEQUENCE public."BetParticipantCLOSED3_id_seq" OWNED BY public."BetParticipantCLOSED3".id;
          public               neondb_owner    false    232            �            1259    57549    BetParticipantCLOSED4    TABLE     J  CREATE TABLE public."BetParticipantCLOSED4" (
    id integer NOT NULL,
    "betCLOSED4Id" integer NOT NULL,
    "userId" integer NOT NULL,
    player public."PlayerChoice" NOT NULL,
    amount double precision NOT NULL,
    odds double precision NOT NULL,
    profit double precision NOT NULL,
    overlap double precision NOT NULL,
    margin double precision NOT NULL,
    return double precision NOT NULL,
    "isWinner" boolean DEFAULT false NOT NULL,
    "isCovered" public."IsCovered" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 +   DROP TABLE public."BetParticipantCLOSED4";
       public         heap r       neondb_owner    false    917    5    908            �            1259    57554    BetParticipantCLOSED4_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetParticipantCLOSED4_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 5   DROP SEQUENCE public."BetParticipantCLOSED4_id_seq";
       public               neondb_owner    false    233    5            (           0    0    BetParticipantCLOSED4_id_seq    SEQUENCE OWNED BY     a   ALTER SEQUENCE public."BetParticipantCLOSED4_id_seq" OWNED BY public."BetParticipantCLOSED4".id;
          public               neondb_owner    false    234            �            1259    57555    BetParticipantCLOSED_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetParticipantCLOSED_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 4   DROP SEQUENCE public."BetParticipantCLOSED_id_seq";
       public               neondb_owner    false    230    5            )           0    0    BetParticipantCLOSED_id_seq    SEQUENCE OWNED BY     _   ALTER SEQUENCE public."BetParticipantCLOSED_id_seq" OWNED BY public."BetParticipantCLOSED".id;
          public               neondb_owner    false    235            �            1259    57556    BetParticipant_id_seq    SEQUENCE     �   CREATE SEQUENCE public."BetParticipant_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public."BetParticipant_id_seq";
       public               neondb_owner    false    225    5            *           0    0    BetParticipant_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public."BetParticipant_id_seq" OWNED BY public."BetParticipant".id;
          public               neondb_owner    false    236            �            1259    57557 
   Bet_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Bet_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public."Bet_id_seq";
       public               neondb_owner    false    5    214            +           0    0 
   Bet_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public."Bet_id_seq" OWNED BY public."Bet".id;
          public               neondb_owner    false    237            �            1259    57558    Category    TABLE     T   CREATE TABLE public."Category" (
    id integer NOT NULL,
    name text NOT NULL
);
    DROP TABLE public."Category";
       public         heap r       neondb_owner    false    5            �            1259    57563    Category_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public."Category_id_seq";
       public               neondb_owner    false    5    238            ,           0    0    Category_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;
          public               neondb_owner    false    239            �            1259    57564 	   ChatUsers    TABLE     
  CREATE TABLE public."ChatUsers" (
    id integer NOT NULL,
    "chatUserId" integer NOT NULL,
    "chatText" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public."ChatUsers";
       public         heap r       neondb_owner    false    5            �            1259    57570    ChatUsers_id_seq    SEQUENCE     �   CREATE SEQUENCE public."ChatUsers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public."ChatUsers_id_seq";
       public               neondb_owner    false    240    5            -           0    0    ChatUsers_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public."ChatUsers_id_seq" OWNED BY public."ChatUsers".id;
          public               neondb_owner    false    241            �            1259    57571    CourseValuta    TABLE     �  CREATE TABLE public."CourseValuta" (
    id integer NOT NULL,
    "USD" double precision NOT NULL,
    "EUR" double precision NOT NULL,
    "BEL" double precision NOT NULL,
    "RUS" double precision NOT NULL,
    "BTC" double precision NOT NULL,
    "USTD" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
 "   DROP TABLE public."CourseValuta";
       public         heap r       neondb_owner    false    5            �            1259    57575    CourseValuta_id_seq    SEQUENCE     �   CREATE SEQUENCE public."CourseValuta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 ,   DROP SEQUENCE public."CourseValuta_id_seq";
       public               neondb_owner    false    5    242            .           0    0    CourseValuta_id_seq    SEQUENCE OWNED BY     O   ALTER SEQUENCE public."CourseValuta_id_seq" OWNED BY public."CourseValuta".id;
          public               neondb_owner    false    243            �            1259    57576    GameUserBet    TABLE     �  CREATE TABLE public."GameUserBet" (
    id integer NOT NULL,
    "gameUserBet1Id" integer NOT NULL,
    "betUser1" double precision NOT NULL,
    "betUser2" double precision,
    "gameUserBetDetails" text DEFAULT ''::text NOT NULL,
    "gameUserBetOpen" boolean DEFAULT false NOT NULL,
    "gameUserBetStatus" boolean DEFAULT false NOT NULL,
    "checkWinUser1" public."WinGameUserBet",
    "checkWinUser2" public."WinGameUserBet",
    "gameUserBet2Id" integer,
    "gameUserBetDataUsers2" jsonb,
    "categoryId" integer NOT NULL,
    "productId" integer NOT NULL,
    "productItemId" integer NOT NULL,
    "statusUserBet" public."GameUserBetStatus" DEFAULT 'OPEN'::public."GameUserBetStatus" NOT NULL,
    "gameUser1Rating" public."RatingUserEnum",
    "gameUser2Rating" public."RatingUserEnum",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
 !   DROP TABLE public."GameUserBet";
       public         heap r       neondb_owner    false    926    920    920    5    926    923    923            �            1259    57586    GameUserBet_id_seq    SEQUENCE     �   CREATE SEQUENCE public."GameUserBet_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public."GameUserBet_id_seq";
       public               neondb_owner    false    5    244            /           0    0    GameUserBet_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public."GameUserBet_id_seq" OWNED BY public."GameUserBet".id;
          public               neondb_owner    false    245            �            1259    57587 
   GlobalData    TABLE       CREATE TABLE public."GlobalData" (
    id integer NOT NULL,
    users integer DEFAULT 0 NOT NULL,
    "betFund" double precision DEFAULT 1000000,
    reg double precision DEFAULT 0,
    ref double precision DEFAULT 0,
    "usersPoints" double precision DEFAULT 0,
    "p2pPoints" double precision DEFAULT 0,
    margin double precision DEFAULT 0,
    "openBetsPoints" double precision DEFAULT 0,
    "gameUserBetOpen" double precision DEFAULT 0,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
     DROP TABLE public."GlobalData";
       public         heap r       neondb_owner    false    5            �            1259    57601    GlobalData_id_seq    SEQUENCE     �   CREATE SEQUENCE public."GlobalData_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public."GlobalData_id_seq";
       public               neondb_owner    false    5    246            0           0    0    GlobalData_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public."GlobalData_id_seq" OWNED BY public."GlobalData".id;
          public               neondb_owner    false    247            �            1259    57602    GlobalUserGame    TABLE     >  CREATE TABLE public."GlobalUserGame" (
    id integer NOT NULL,
    "globalUserId" integer NOT NULL,
    plus integer DEFAULT 0 NOT NULL,
    minus integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
 $   DROP TABLE public."GlobalUserGame";
       public         heap r       neondb_owner    false    5            �            1259    57608    GlobalUserGame_id_seq    SEQUENCE     �   CREATE SEQUENCE public."GlobalUserGame_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public."GlobalUserGame_id_seq";
       public               neondb_owner    false    248    5            1           0    0    GlobalUserGame_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public."GlobalUserGame_id_seq" OWNED BY public."GlobalUserGame".id;
          public               neondb_owner    false    249            �            1259    57609    HeroesControl    TABLE     �  CREATE TABLE public."HeroesControl" (
    id integer DEFAULT 1 NOT NULL,
    "globalStop" boolean DEFAULT false NOT NULL,
    "stopP2P" boolean DEFAULT false NOT NULL,
    "stopTransferPoints" boolean DEFAULT false NOT NULL,
    "stopGameUserCreate" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
 #   DROP TABLE public."HeroesControl";
       public         heap r       neondb_owner    false    5            �            1259    57618    OrderP2P    TABLE     �  CREATE TABLE public."OrderP2P" (
    id integer NOT NULL,
    "orderP2PUser1Id" integer NOT NULL,
    "orderP2PUser2Id" integer,
    "orderP2PBuySell" public."BuySell" NOT NULL,
    "orderP2PPoints" double precision NOT NULL,
    "orderP2PPrice" double precision,
    "orderP2PPart" boolean DEFAULT false NOT NULL,
    "orderBankDetails" jsonb NOT NULL,
    "orderP2PStatus" public."OrderP2PStatus" DEFAULT 'OPEN'::public."OrderP2PStatus" NOT NULL,
    "orderP2PCheckUser1" boolean,
    "orderP2PCheckUser2" boolean,
    "orderBankPay" jsonb,
    "isProcessing" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public."OrderP2P";
       public         heap r       neondb_owner    false    914    5    914    911            �            1259    57627    OrderP2P_id_seq    SEQUENCE     �   CREATE SEQUENCE public."OrderP2P_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public."OrderP2P_id_seq";
       public               neondb_owner    false    5    251            2           0    0    OrderP2P_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public."OrderP2P_id_seq" OWNED BY public."OrderP2P".id;
          public               neondb_owner    false    252            �            1259    57628    Player    TABLE     e  CREATE TABLE public."Player" (
    id integer NOT NULL,
    name text NOT NULL,
    twitch text,
    "userId" integer,
    "countGame" integer,
    "winGame" integer,
    "lossGame" integer,
    "rateGame" double precision,
    "HeroesCup1deaL" json,
    "HeroesCup" json,
    "HeroesCup2" json,
    "HeroesCup3" json,
    "HC3PO" json,
    "HC2PO" json
);
    DROP TABLE public."Player";
       public         heap r       neondb_owner    false    5            �            1259    57633    PlayerStatistic    TABLE     �  CREATE TABLE public."PlayerStatistic" (
    id integer NOT NULL,
    "turnirId" integer NOT NULL,
    "categoryId" integer NOT NULL,
    "playerId" integer NOT NULL,
    color public."ColorPlayer" NOT NULL,
    city public."CityHeroes",
    gold integer DEFAULT 0,
    security character varying(255) DEFAULT ''::character varying,
    win boolean NOT NULL,
    link character varying(255) DEFAULT ''::character varying
);
 %   DROP TABLE public."PlayerStatistic";
       public         heap r       neondb_owner    false    932    5    929            �            1259    57641    PlayerStatistic_id_seq    SEQUENCE     �   CREATE SEQUENCE public."PlayerStatistic_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 /   DROP SEQUENCE public."PlayerStatistic_id_seq";
       public               neondb_owner    false    5    254            3           0    0    PlayerStatistic_id_seq    SEQUENCE OWNED BY     U   ALTER SEQUENCE public."PlayerStatistic_id_seq" OWNED BY public."PlayerStatistic".id;
          public               neondb_owner    false    255                        1259    57642    Player_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Player_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public."Player_id_seq";
       public               neondb_owner    false    5    253            4           0    0    Player_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public."Player_id_seq" OWNED BY public."Player".id;
          public               neondb_owner    false    256                       1259    57643    Product    TABLE     S   CREATE TABLE public."Product" (
    id integer NOT NULL,
    name text NOT NULL
);
    DROP TABLE public."Product";
       public         heap r       neondb_owner    false    5                       1259    57648    ProductItem    TABLE     W   CREATE TABLE public."ProductItem" (
    id integer NOT NULL,
    name text NOT NULL
);
 !   DROP TABLE public."ProductItem";
       public         heap r       neondb_owner    false    5                       1259    57653    ProductItem_id_seq    SEQUENCE     �   CREATE SEQUENCE public."ProductItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public."ProductItem_id_seq";
       public               neondb_owner    false    258    5            5           0    0    ProductItem_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public."ProductItem_id_seq" OWNED BY public."ProductItem".id;
          public               neondb_owner    false    259                       1259    57654    Product_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public."Product_id_seq";
       public               neondb_owner    false    5    257            6           0    0    Product_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public."Product_id_seq" OWNED BY public."Product".id;
          public               neondb_owner    false    260                       1259    57655    ReferralUserIpAddress    TABLE     �  CREATE TABLE public."ReferralUserIpAddress" (
    id integer NOT NULL,
    "referralUserId" integer NOT NULL,
    "referralIpAddress" text NOT NULL,
    "referralStatus" boolean DEFAULT false NOT NULL,
    "referralPoints" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
 +   DROP TABLE public."ReferralUserIpAddress";
       public         heap r       neondb_owner    false    5                       1259    57663    ReferralUserIpAddress_id_seq    SEQUENCE     �   CREATE SEQUENCE public."ReferralUserIpAddress_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 5   DROP SEQUENCE public."ReferralUserIpAddress_id_seq";
       public               neondb_owner    false    261    5            7           0    0    ReferralUserIpAddress_id_seq    SEQUENCE OWNED BY     a   ALTER SEQUENCE public."ReferralUserIpAddress_id_seq" OWNED BY public."ReferralUserIpAddress".id;
          public               neondb_owner    false    262                       1259    57664 	   RegPoints    TABLE     "  CREATE TABLE public."RegPoints" (
    id integer NOT NULL,
    "regPointsUserId" integer NOT NULL,
    "regPointsPoints" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public."RegPoints";
       public         heap r       neondb_owner    false    5                       1259    57668    RegPoints_id_seq    SEQUENCE     �   CREATE SEQUENCE public."RegPoints_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public."RegPoints_id_seq";
       public               neondb_owner    false    5    263            8           0    0    RegPoints_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public."RegPoints_id_seq" OWNED BY public."RegPoints".id;
          public               neondb_owner    false    264            	           1259    57669    Transfer    TABLE     ]  CREATE TABLE public."Transfer" (
    id integer NOT NULL,
    "transferUser1Id" integer NOT NULL,
    "transferUser2Id" integer,
    "transferPoints" double precision NOT NULL,
    "transferStatus" boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public."Transfer";
       public         heap r       neondb_owner    false    5            
           1259    57673    Transfer_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Transfer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public."Transfer_id_seq";
       public               neondb_owner    false    265    5            9           0    0    Transfer_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public."Transfer_id_seq" OWNED BY public."Transfer".id;
          public               neondb_owner    false    266                       1259    57674    Turnir    TABLE     �  CREATE TABLE public."Turnir" (
    id integer NOT NULL,
    "titleTurnir" text NOT NULL,
    "textTurnirTurnir" text NOT NULL,
    "startPointsTurnir" double precision NOT NULL,
    "statusTurnir" public."StatusTurnir" DEFAULT 'REGISTRATION'::public."StatusTurnir" NOT NULL,
    "TurnirBool" boolean DEFAULT true NOT NULL,
    "turnirLap1" jsonb,
    "turnirLap2" jsonb,
    "turnirLap3" jsonb,
    "turnirLap4" jsonb,
    "turnirLap5" jsonb,
    "turnirLap6" jsonb,
    "turnirLap7" jsonb,
    "turnirLap8" jsonb,
    "turnirLap9" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public."Turnir";
       public         heap r       neondb_owner    false    899    5    899                       1259    57682 	   TurnirBet    TABLE     b   CREATE TABLE public."TurnirBet" (
    id integer NOT NULL,
    name character varying NOT NULL
);
    DROP TABLE public."TurnirBet";
       public         heap r       neondb_owner    false    5                       1259    57687    TurnirBet_id_seq    SEQUENCE     �   CREATE SEQUENCE public."TurnirBet_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public."TurnirBet_id_seq";
       public               neondb_owner    false    5    268            :           0    0    TurnirBet_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public."TurnirBet_id_seq" OWNED BY public."TurnirBet".id;
          public               neondb_owner    false    269                       1259    57688    TurnirPlayer    TABLE     �  CREATE TABLE public."TurnirPlayer" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "startPointsPlayer" double precision NOT NULL,
    "checkPointsPlayer" double precision,
    "playerBool" boolean DEFAULT true NOT NULL,
    "turnirId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
 "   DROP TABLE public."TurnirPlayer";
       public         heap r       neondb_owner    false    5                       1259    57693    TurnirPlayer_id_seq    SEQUENCE     �   CREATE SEQUENCE public."TurnirPlayer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 ,   DROP SEQUENCE public."TurnirPlayer_id_seq";
       public               neondb_owner    false    270    5            ;           0    0    TurnirPlayer_id_seq    SEQUENCE OWNED BY     O   ALTER SEQUENCE public."TurnirPlayer_id_seq" OWNED BY public."TurnirPlayer".id;
          public               neondb_owner    false    271                       1259    57694    Turnir_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Turnir_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public."Turnir_id_seq";
       public               neondb_owner    false    267    5            <           0    0    Turnir_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public."Turnir_id_seq" OWNED BY public."Turnir".id;
          public               neondb_owner    false    272                       1259    57695    UpdateDateTime    TABLE     B  CREATE TABLE public."UpdateDateTime" (
    id integer NOT NULL,
    "UDTvaluta" timestamp(3) without time zone NOT NULL,
    "UDTOrderP2P" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
 $   DROP TABLE public."UpdateDateTime";
       public         heap r       neondb_owner    false    5                       1259    57699    UpdateDateTime_id_seq    SEQUENCE     �   CREATE SEQUENCE public."UpdateDateTime_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public."UpdateDateTime_id_seq";
       public               neondb_owner    false    5    273            =           0    0    UpdateDateTime_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public."UpdateDateTime_id_seq" OWNED BY public."UpdateDateTime".id;
          public               neondb_owner    false    274                       1259    57700    User    TABLE     �  CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    "cardId" text NOT NULL,
    "fullName" text NOT NULL,
    provider text,
    "providerId" text,
    password text NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    img text,
    points double precision DEFAULT 0 NOT NULL,
    "p2pPlus" integer DEFAULT 0,
    "p2pMinus" integer DEFAULT 0,
    contact jsonb,
    "loginHistory" jsonb,
    "resetToken" text,
    "bankDetails" jsonb,
    telegram text,
    "telegramView" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public."User";
       public         heap r       neondb_owner    false    905    905    5                       1259    57711    User_id_seq    SEQUENCE     �   CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public."User_id_seq";
       public               neondb_owner    false    5    275            >           0    0    User_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;
          public               neondb_owner    false    276            ,           2604    57712    Bet id    DEFAULT     d   ALTER TABLE ONLY public."Bet" ALTER COLUMN id SET DEFAULT nextval('public."Bet_id_seq"'::regclass);
 7   ALTER TABLE public."Bet" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    237    214            2           2604    57713    Bet3 id    DEFAULT     f   ALTER TABLE ONLY public."Bet3" ALTER COLUMN id SET DEFAULT nextval('public."Bet3_id_seq"'::regclass);
 8   ALTER TABLE public."Bet3" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    216    215            ;           2604    57714    Bet4 id    DEFAULT     f   ALTER TABLE ONLY public."Bet4" ALTER COLUMN id SET DEFAULT nextval('public."Bet4_id_seq"'::regclass);
 8   ALTER TABLE public."Bet4" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    218    217            E           2604    57715    BetCLOSED id    DEFAULT     p   ALTER TABLE ONLY public."BetCLOSED" ALTER COLUMN id SET DEFAULT nextval('public."BetCLOSED_id_seq"'::regclass);
 =   ALTER TABLE public."BetCLOSED" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    224    219            K           2604    57716    BetCLOSED3 id    DEFAULT     r   ALTER TABLE ONLY public."BetCLOSED3" ALTER COLUMN id SET DEFAULT nextval('public."BetCLOSED3_id_seq"'::regclass);
 >   ALTER TABLE public."BetCLOSED3" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    221    220            Q           2604    57717    BetCLOSED4 id    DEFAULT     r   ALTER TABLE ONLY public."BetCLOSED4" ALTER COLUMN id SET DEFAULT nextval('public."BetCLOSED4_id_seq"'::regclass);
 >   ALTER TABLE public."BetCLOSED4" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    223    222            W           2604    57718    BetParticipant id    DEFAULT     z   ALTER TABLE ONLY public."BetParticipant" ALTER COLUMN id SET DEFAULT nextval('public."BetParticipant_id_seq"'::regclass);
 B   ALTER TABLE public."BetParticipant" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    236    225            [           2604    57719    BetParticipant3 id    DEFAULT     |   ALTER TABLE ONLY public."BetParticipant3" ALTER COLUMN id SET DEFAULT nextval('public."BetParticipant3_id_seq"'::regclass);
 C   ALTER TABLE public."BetParticipant3" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    227    226            _           2604    57720    BetParticipant4 id    DEFAULT     |   ALTER TABLE ONLY public."BetParticipant4" ALTER COLUMN id SET DEFAULT nextval('public."BetParticipant4_id_seq"'::regclass);
 C   ALTER TABLE public."BetParticipant4" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    229    228            c           2604    57721    BetParticipantCLOSED id    DEFAULT     �   ALTER TABLE ONLY public."BetParticipantCLOSED" ALTER COLUMN id SET DEFAULT nextval('public."BetParticipantCLOSED_id_seq"'::regclass);
 H   ALTER TABLE public."BetParticipantCLOSED" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    235    230            f           2604    57722    BetParticipantCLOSED3 id    DEFAULT     �   ALTER TABLE ONLY public."BetParticipantCLOSED3" ALTER COLUMN id SET DEFAULT nextval('public."BetParticipantCLOSED3_id_seq"'::regclass);
 I   ALTER TABLE public."BetParticipantCLOSED3" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    232    231            i           2604    57723    BetParticipantCLOSED4 id    DEFAULT     �   ALTER TABLE ONLY public."BetParticipantCLOSED4" ALTER COLUMN id SET DEFAULT nextval('public."BetParticipantCLOSED4_id_seq"'::regclass);
 I   ALTER TABLE public."BetParticipantCLOSED4" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    234    233            l           2604    57724    Category id    DEFAULT     n   ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);
 <   ALTER TABLE public."Category" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    239    238            m           2604    57725    ChatUsers id    DEFAULT     p   ALTER TABLE ONLY public."ChatUsers" ALTER COLUMN id SET DEFAULT nextval('public."ChatUsers_id_seq"'::regclass);
 =   ALTER TABLE public."ChatUsers" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    241    240            o           2604    57726    CourseValuta id    DEFAULT     v   ALTER TABLE ONLY public."CourseValuta" ALTER COLUMN id SET DEFAULT nextval('public."CourseValuta_id_seq"'::regclass);
 @   ALTER TABLE public."CourseValuta" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    243    242            q           2604    57727    GameUserBet id    DEFAULT     t   ALTER TABLE ONLY public."GameUserBet" ALTER COLUMN id SET DEFAULT nextval('public."GameUserBet_id_seq"'::regclass);
 ?   ALTER TABLE public."GameUserBet" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    245    244            w           2604    57728    GlobalData id    DEFAULT     r   ALTER TABLE ONLY public."GlobalData" ALTER COLUMN id SET DEFAULT nextval('public."GlobalData_id_seq"'::regclass);
 >   ALTER TABLE public."GlobalData" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    247    246            �           2604    57729    GlobalUserGame id    DEFAULT     z   ALTER TABLE ONLY public."GlobalUserGame" ALTER COLUMN id SET DEFAULT nextval('public."GlobalUserGame_id_seq"'::regclass);
 B   ALTER TABLE public."GlobalUserGame" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    249    248            �           2604    57730    OrderP2P id    DEFAULT     n   ALTER TABLE ONLY public."OrderP2P" ALTER COLUMN id SET DEFAULT nextval('public."OrderP2P_id_seq"'::regclass);
 <   ALTER TABLE public."OrderP2P" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    252    251            �           2604    57731 	   Player id    DEFAULT     j   ALTER TABLE ONLY public."Player" ALTER COLUMN id SET DEFAULT nextval('public."Player_id_seq"'::regclass);
 :   ALTER TABLE public."Player" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    256    253            �           2604    57732    PlayerStatistic id    DEFAULT     |   ALTER TABLE ONLY public."PlayerStatistic" ALTER COLUMN id SET DEFAULT nextval('public."PlayerStatistic_id_seq"'::regclass);
 C   ALTER TABLE public."PlayerStatistic" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    255    254            �           2604    57733 
   Product id    DEFAULT     l   ALTER TABLE ONLY public."Product" ALTER COLUMN id SET DEFAULT nextval('public."Product_id_seq"'::regclass);
 ;   ALTER TABLE public."Product" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    260    257            �           2604    57734    ProductItem id    DEFAULT     t   ALTER TABLE ONLY public."ProductItem" ALTER COLUMN id SET DEFAULT nextval('public."ProductItem_id_seq"'::regclass);
 ?   ALTER TABLE public."ProductItem" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    259    258            �           2604    57735    ReferralUserIpAddress id    DEFAULT     �   ALTER TABLE ONLY public."ReferralUserIpAddress" ALTER COLUMN id SET DEFAULT nextval('public."ReferralUserIpAddress_id_seq"'::regclass);
 I   ALTER TABLE public."ReferralUserIpAddress" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    262    261            �           2604    57736    RegPoints id    DEFAULT     p   ALTER TABLE ONLY public."RegPoints" ALTER COLUMN id SET DEFAULT nextval('public."RegPoints_id_seq"'::regclass);
 =   ALTER TABLE public."RegPoints" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    264    263            �           2604    57737    Transfer id    DEFAULT     n   ALTER TABLE ONLY public."Transfer" ALTER COLUMN id SET DEFAULT nextval('public."Transfer_id_seq"'::regclass);
 <   ALTER TABLE public."Transfer" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    266    265            �           2604    57738 	   Turnir id    DEFAULT     j   ALTER TABLE ONLY public."Turnir" ALTER COLUMN id SET DEFAULT nextval('public."Turnir_id_seq"'::regclass);
 :   ALTER TABLE public."Turnir" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    272    267            �           2604    57739    TurnirBet id    DEFAULT     p   ALTER TABLE ONLY public."TurnirBet" ALTER COLUMN id SET DEFAULT nextval('public."TurnirBet_id_seq"'::regclass);
 =   ALTER TABLE public."TurnirBet" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    269    268            �           2604    57740    TurnirPlayer id    DEFAULT     v   ALTER TABLE ONLY public."TurnirPlayer" ALTER COLUMN id SET DEFAULT nextval('public."TurnirPlayer_id_seq"'::regclass);
 @   ALTER TABLE public."TurnirPlayer" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    271    270            �           2604    57741    UpdateDateTime id    DEFAULT     z   ALTER TABLE ONLY public."UpdateDateTime" ALTER COLUMN id SET DEFAULT nextval('public."UpdateDateTime_id_seq"'::regclass);
 B   ALTER TABLE public."UpdateDateTime" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    274    273            �           2604    57742    User id    DEFAULT     f   ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);
 8   ALTER TABLE public."User" ALTER COLUMN id DROP DEFAULT;
       public               neondb_owner    false    276    275            �          0    57459    Bet 
   TABLE DATA           �  COPY public."Bet" (id, "player1Id", "player2Id", "initBetPlayer1", "initBetPlayer2", "totalBetPlayer1", "totalBetPlayer2", "oddsBetPlayer1", "oddsBetPlayer2", "maxBetPlayer1", "maxBetPlayer2", "overlapPlayer1", "overlapPlayer2", margin, "totalBetAmount", "creatorId", status, "categoryId", "productId", "productItemId", "winnerId", "suspendedBet", description, "isProcessing", "createdAt", "updatedAt", "turnirBetId") FROM stdin;
    public               neondb_owner    false    214   ��      �          0    57469    Bet3 
   TABLE DATA           1  COPY public."Bet3" (id, "player1Id", "player2Id", "player3Id", "initBetPlayer1", "initBetPlayer2", "initBetPlayer3", "totalBetPlayer1", "totalBetPlayer2", "totalBetPlayer3", "oddsBetPlayer1", "oddsBetPlayer2", "oddsBetPlayer3", "maxBetPlayer1", "maxBetPlayer2", "maxBetPlayer3", "overlapPlayer1", "overlapPlayer2", "overlapPlayer3", margin, "totalBetAmount", "creatorId", status, "categoryId", "productId", "productItemId", "winnerId", "suspendedBet", description, "isProcessing", "createdAt", "updatedAt", "turnirBetId", "betP1", "betP2", "betP3") FROM stdin;
    public               neondb_owner    false    215   �      �          0    57480    Bet4 
   TABLE DATA           �  COPY public."Bet4" (id, "player1Id", "player2Id", "player3Id", "player4Id", "initBetPlayer1", "initBetPlayer2", "initBetPlayer3", "initBetPlayer4", "totalBetPlayer1", "totalBetPlayer2", "totalBetPlayer3", "totalBetPlayer4", "oddsBetPlayer1", "oddsBetPlayer2", "oddsBetPlayer3", "oddsBetPlayer4", "maxBetPlayer1", "maxBetPlayer2", "maxBetPlayer3", "maxBetPlayer4", "overlapPlayer1", "overlapPlayer2", "overlapPlayer3", "overlapPlayer4", margin, "totalBetAmount", "creatorId", status, "categoryId", "productId", "productItemId", "winnerId", "suspendedBet", description, "isProcessing", "createdAt", "updatedAt", "turnirBetId", "betP1", "betP2", "betP3", "betP4") FROM stdin;
    public               neondb_owner    false    217   8�      �          0    57491 	   BetCLOSED 
   TABLE DATA           �  COPY public."BetCLOSED" (id, "player1Id", "player2Id", "totalBetAmount", "returnBetAmount", "globalDataBetFund", "initBetPlayer1", "initBetPlayer2", "totalBetPlayer1", "totalBetPlayer2", "oddsBetPlayer1", "oddsBetPlayer2", "maxBetPlayer1", "maxBetPlayer2", "overlapPlayer1", "overlapPlayer2", margin, "creatorId", status, "categoryId", "productId", "productItemId", "winnerId", "createdAt", "updatedAt", "turnirBetId") FROM stdin;
    public               neondb_owner    false    219   �      �          0    57499 
   BetCLOSED3 
   TABLE DATA             COPY public."BetCLOSED3" (id, "player1Id", "player2Id", "player3Id", "totalBetAmount", "returnBetAmount", "globalDataBetFund", "initBetPlayer1", "initBetPlayer2", "initBetPlayer3", "totalBetPlayer1", "totalBetPlayer2", "totalBetPlayer3", "oddsBetPlayer1", "oddsBetPlayer2", "oddsBetPlayer3", "maxBetPlayer1", "maxBetPlayer2", "maxBetPlayer3", "overlapPlayer1", "overlapPlayer2", "overlapPlayer3", margin, "creatorId", status, "categoryId", "productId", "productItemId", "winnerId", "createdAt", "updatedAt", "turnirBetId") FROM stdin;
    public               neondb_owner    false    220         �          0    57508 
   BetCLOSED4 
   TABLE DATA           ~  COPY public."BetCLOSED4" (id, "player1Id", "player2Id", "player3Id", "player4Id", "totalBetAmount", "returnBetAmount", "globalDataBetFund", "initBetPlayer1", "initBetPlayer2", "initBetPlayer3", "initBetPlayer4", "totalBetPlayer1", "totalBetPlayer2", "totalBetPlayer3", "totalBetPlayer4", "oddsBetPlayer1", "oddsBetPlayer2", "oddsBetPlayer3", "oddsBetPlayer4", "maxBetPlayer1", "maxBetPlayer2", "maxBetPlayer3", "maxBetPlayer4", "overlapPlayer1", "overlapPlayer2", "overlapPlayer3", "overlapPlayer4", margin, "creatorId", status, "categoryId", "productId", "productItemId", "winnerId", "createdAt", "updatedAt", "turnirBetId") FROM stdin;
    public               neondb_owner    false    222   $      �          0    57518    BetParticipant 
   TABLE DATA           �   COPY public."BetParticipant" (id, "betId", "userId", player, amount, odds, profit, overlap, margin, "isCovered", "isProcessing", "isWinner", "createdAt") FROM stdin;
    public               neondb_owner    false    225   �      �          0    57524    BetParticipant3 
   TABLE DATA           �   COPY public."BetParticipant3" (id, "betId", "userId", player, amount, odds, profit, overlap, margin, "isWinner", "isProcessing", "isCovered", "createdAt") FROM stdin;
    public               neondb_owner    false    226         �          0    57531    BetParticipant4 
   TABLE DATA           �   COPY public."BetParticipant4" (id, "betId", "userId", player, amount, odds, profit, overlap, margin, "isWinner", "isProcessing", "isCovered", "createdAt") FROM stdin;
    public               neondb_owner    false    228   5      �          0    57538    BetParticipantCLOSED 
   TABLE DATA           �   COPY public."BetParticipantCLOSED" (id, "betCLOSEDId", "userId", player, amount, odds, profit, overlap, margin, return, "isWinner", "isCovered", "createdAt") FROM stdin;
    public               neondb_owner    false    230   r      �          0    57543    BetParticipantCLOSED3 
   TABLE DATA           �   COPY public."BetParticipantCLOSED3" (id, "betCLOSED3Id", "userId", player, amount, odds, profit, overlap, margin, return, "isWinner", "isCovered", "createdAt") FROM stdin;
    public               neondb_owner    false    231         �          0    57549    BetParticipantCLOSED4 
   TABLE DATA           �   COPY public."BetParticipantCLOSED4" (id, "betCLOSED4Id", "userId", player, amount, odds, profit, overlap, margin, return, "isWinner", "isCovered", "createdAt") FROM stdin;
    public               neondb_owner    false    233   0      �          0    57558    Category 
   TABLE DATA           .   COPY public."Category" (id, name) FROM stdin;
    public               neondb_owner    false    238   �      �          0    57564 	   ChatUsers 
   TABLE DATA           ]   COPY public."ChatUsers" (id, "chatUserId", "chatText", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    240   ]      �          0    57571    CourseValuta 
   TABLE DATA           q   COPY public."CourseValuta" (id, "USD", "EUR", "BEL", "RUS", "BTC", "USTD", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    242   z      �          0    57576    GameUserBet 
   TABLE DATA           ]  COPY public."GameUserBet" (id, "gameUserBet1Id", "betUser1", "betUser2", "gameUserBetDetails", "gameUserBetOpen", "gameUserBetStatus", "checkWinUser1", "checkWinUser2", "gameUserBet2Id", "gameUserBetDataUsers2", "categoryId", "productId", "productItemId", "statusUserBet", "gameUser1Rating", "gameUser2Rating", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    244   �      �          0    57587 
   GlobalData 
   TABLE DATA           �   COPY public."GlobalData" (id, users, "betFund", reg, ref, "usersPoints", "p2pPoints", margin, "openBetsPoints", "gameUserBetOpen", "isProcessing", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    246   �      �          0    57602    GlobalUserGame 
   TABLE DATA           e   COPY public."GlobalUserGame" (id, "globalUserId", plus, minus, "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    248   �"      �          0    57609    HeroesControl 
   TABLE DATA           �   COPY public."HeroesControl" (id, "globalStop", "stopP2P", "stopTransferPoints", "stopGameUserCreate", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    250   #      �          0    57618    OrderP2P 
   TABLE DATA              COPY public."OrderP2P" (id, "orderP2PUser1Id", "orderP2PUser2Id", "orderP2PBuySell", "orderP2PPoints", "orderP2PPrice", "orderP2PPart", "orderBankDetails", "orderP2PStatus", "orderP2PCheckUser1", "orderP2PCheckUser2", "orderBankPay", "isProcessing", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    251   H#      �          0    57628    Player 
   TABLE DATA           �   COPY public."Player" (id, name, twitch, "userId", "countGame", "winGame", "lossGame", "rateGame", "HeroesCup1deaL", "HeroesCup", "HeroesCup2", "HeroesCup3", "HC3PO", "HC2PO") FROM stdin;
    public               neondb_owner    false    253   �)                 0    57633    PlayerStatistic 
   TABLE DATA           }   COPY public."PlayerStatistic" (id, "turnirId", "categoryId", "playerId", color, city, gold, security, win, link) FROM stdin;
    public               neondb_owner    false    254   =2                0    57643    Product 
   TABLE DATA           -   COPY public."Product" (id, name) FROM stdin;
    public               neondb_owner    false    257   �T                0    57648    ProductItem 
   TABLE DATA           1   COPY public."ProductItem" (id, name) FROM stdin;
    public               neondb_owner    false    258   �T                0    57655    ReferralUserIpAddress 
   TABLE DATA           �   COPY public."ReferralUserIpAddress" (id, "referralUserId", "referralIpAddress", "referralStatus", "referralPoints", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    261   yU      	          0    57664 	   RegPoints 
   TABLE DATA           i   COPY public."RegPoints" (id, "regPointsUserId", "regPointsPoints", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    263   �U                0    57669    Transfer 
   TABLE DATA           �   COPY public."Transfer" (id, "transferUser1Id", "transferUser2Id", "transferPoints", "transferStatus", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    265   �V                0    57674    Turnir 
   TABLE DATA             COPY public."Turnir" (id, "titleTurnir", "textTurnirTurnir", "startPointsTurnir", "statusTurnir", "TurnirBool", "turnirLap1", "turnirLap2", "turnirLap3", "turnirLap4", "turnirLap5", "turnirLap6", "turnirLap7", "turnirLap8", "turnirLap9", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    267   @W                0    57682 	   TurnirBet 
   TABLE DATA           /   COPY public."TurnirBet" (id, name) FROM stdin;
    public               neondb_owner    false    268   �W                0    57688    TurnirPlayer 
   TABLE DATA           �   COPY public."TurnirPlayer" (id, "userId", "startPointsPlayer", "checkPointsPlayer", "playerBool", "turnirId", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    270   X                0    57695    UpdateDateTime 
   TABLE DATA           d   COPY public."UpdateDateTime" (id, "UDTvaluta", "UDTOrderP2P", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    273   �X                0    57700    User 
   TABLE DATA           �   COPY public."User" (id, email, "cardId", "fullName", provider, "providerId", password, role, img, points, "p2pPlus", "p2pMinus", contact, "loginHistory", "resetToken", "bankDetails", telegram, "telegramView", "createdAt", "updatedAt") FROM stdin;
    public               neondb_owner    false    275   �X      ?           0    0    Bet3_id_seq    SEQUENCE SET     <   SELECT pg_catalog.setval('public."Bet3_id_seq"', 1, false);
          public               neondb_owner    false    216            @           0    0    Bet4_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public."Bet4_id_seq"', 6, true);
          public               neondb_owner    false    218            A           0    0    BetCLOSED3_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public."BetCLOSED3_id_seq"', 1, false);
          public               neondb_owner    false    221            B           0    0    BetCLOSED4_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public."BetCLOSED4_id_seq"', 4, true);
          public               neondb_owner    false    223            C           0    0    BetCLOSED_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public."BetCLOSED_id_seq"', 31, true);
          public               neondb_owner    false    224            D           0    0    BetParticipant3_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public."BetParticipant3_id_seq"', 1, false);
          public               neondb_owner    false    227            E           0    0    BetParticipant4_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public."BetParticipant4_id_seq"', 26, true);
          public               neondb_owner    false    229            F           0    0    BetParticipantCLOSED3_id_seq    SEQUENCE SET     M   SELECT pg_catalog.setval('public."BetParticipantCLOSED3_id_seq"', 1, false);
          public               neondb_owner    false    232            G           0    0    BetParticipantCLOSED4_id_seq    SEQUENCE SET     M   SELECT pg_catalog.setval('public."BetParticipantCLOSED4_id_seq"', 12, true);
          public               neondb_owner    false    234            H           0    0    BetParticipantCLOSED_id_seq    SEQUENCE SET     M   SELECT pg_catalog.setval('public."BetParticipantCLOSED_id_seq"', 150, true);
          public               neondb_owner    false    235            I           0    0    BetParticipant_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public."BetParticipant_id_seq"', 150, true);
          public               neondb_owner    false    236            J           0    0 
   Bet_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public."Bet_id_seq"', 31, true);
          public               neondb_owner    false    237            K           0    0    Category_id_seq    SEQUENCE SET     @   SELECT pg_catalog.setval('public."Category_id_seq"', 20, true);
          public               neondb_owner    false    239            L           0    0    ChatUsers_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public."ChatUsers_id_seq"', 1, false);
          public               neondb_owner    false    241            M           0    0    CourseValuta_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public."CourseValuta_id_seq"', 1, true);
          public               neondb_owner    false    243            N           0    0    GameUserBet_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public."GameUserBet_id_seq"', 1, false);
          public               neondb_owner    false    245            O           0    0    GlobalData_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public."GlobalData_id_seq"', 159, true);
          public               neondb_owner    false    247            P           0    0    GlobalUserGame_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public."GlobalUserGame_id_seq"', 1, false);
          public               neondb_owner    false    249            Q           0    0    OrderP2P_id_seq    SEQUENCE SET     @   SELECT pg_catalog.setval('public."OrderP2P_id_seq"', 21, true);
          public               neondb_owner    false    252            R           0    0    PlayerStatistic_id_seq    SEQUENCE SET     H   SELECT pg_catalog.setval('public."PlayerStatistic_id_seq"', 580, true);
          public               neondb_owner    false    255            S           0    0    Player_id_seq    SEQUENCE SET     >   SELECT pg_catalog.setval('public."Player_id_seq"', 65, true);
          public               neondb_owner    false    256            T           0    0    ProductItem_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public."ProductItem_id_seq"', 29, true);
          public               neondb_owner    false    259            U           0    0    Product_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public."Product_id_seq"', 14, true);
          public               neondb_owner    false    260            V           0    0    ReferralUserIpAddress_id_seq    SEQUENCE SET     L   SELECT pg_catalog.setval('public."ReferralUserIpAddress_id_seq"', 3, true);
          public               neondb_owner    false    262            W           0    0    RegPoints_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public."RegPoints_id_seq"', 11, true);
          public               neondb_owner    false    264            X           0    0    Transfer_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public."Transfer_id_seq"', 5, true);
          public               neondb_owner    false    266            Y           0    0    TurnirBet_id_seq    SEQUENCE SET     @   SELECT pg_catalog.setval('public."TurnirBet_id_seq"', 6, true);
          public               neondb_owner    false    269            Z           0    0    TurnirPlayer_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public."TurnirPlayer_id_seq"', 4, true);
          public               neondb_owner    false    271            [           0    0    Turnir_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public."Turnir_id_seq"', 1, true);
          public               neondb_owner    false    272            \           0    0    UpdateDateTime_id_seq    SEQUENCE SET     E   SELECT pg_catalog.setval('public."UpdateDateTime_id_seq"', 1, true);
          public               neondb_owner    false    274            ]           0    0    User_id_seq    SEQUENCE SET     <   SELECT pg_catalog.setval('public."User_id_seq"', 16, true);
          public               neondb_owner    false    276            �           2606    57744    Bet3 Bet3_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_pkey" PRIMARY KEY (id);
 <   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_pkey";
       public                 neondb_owner    false    215            �           2606    57746    Bet4 Bet4_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_pkey" PRIMARY KEY (id);
 <   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_pkey";
       public                 neondb_owner    false    217            �           2606    57748    BetCLOSED3 BetCLOSED3_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_pkey" PRIMARY KEY (id);
 H   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_pkey";
       public                 neondb_owner    false    220            �           2606    57750    BetCLOSED4 BetCLOSED4_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_pkey" PRIMARY KEY (id);
 H   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_pkey";
       public                 neondb_owner    false    222            �           2606    57752    BetCLOSED BetCLOSED_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT "BetCLOSED_pkey" PRIMARY KEY (id);
 F   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT "BetCLOSED_pkey";
       public                 neondb_owner    false    219            �           2606    57754 $   BetParticipant3 BetParticipant3_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public."BetParticipant3"
    ADD CONSTRAINT "BetParticipant3_pkey" PRIMARY KEY (id);
 R   ALTER TABLE ONLY public."BetParticipant3" DROP CONSTRAINT "BetParticipant3_pkey";
       public                 neondb_owner    false    226            �           2606    57756 $   BetParticipant4 BetParticipant4_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public."BetParticipant4"
    ADD CONSTRAINT "BetParticipant4_pkey" PRIMARY KEY (id);
 R   ALTER TABLE ONLY public."BetParticipant4" DROP CONSTRAINT "BetParticipant4_pkey";
       public                 neondb_owner    false    228            �           2606    57758 0   BetParticipantCLOSED3 BetParticipantCLOSED3_pkey 
   CONSTRAINT     r   ALTER TABLE ONLY public."BetParticipantCLOSED3"
    ADD CONSTRAINT "BetParticipantCLOSED3_pkey" PRIMARY KEY (id);
 ^   ALTER TABLE ONLY public."BetParticipantCLOSED3" DROP CONSTRAINT "BetParticipantCLOSED3_pkey";
       public                 neondb_owner    false    231            �           2606    57760 0   BetParticipantCLOSED4 BetParticipantCLOSED4_pkey 
   CONSTRAINT     r   ALTER TABLE ONLY public."BetParticipantCLOSED4"
    ADD CONSTRAINT "BetParticipantCLOSED4_pkey" PRIMARY KEY (id);
 ^   ALTER TABLE ONLY public."BetParticipantCLOSED4" DROP CONSTRAINT "BetParticipantCLOSED4_pkey";
       public                 neondb_owner    false    233            �           2606    57762 .   BetParticipantCLOSED BetParticipantCLOSED_pkey 
   CONSTRAINT     p   ALTER TABLE ONLY public."BetParticipantCLOSED"
    ADD CONSTRAINT "BetParticipantCLOSED_pkey" PRIMARY KEY (id);
 \   ALTER TABLE ONLY public."BetParticipantCLOSED" DROP CONSTRAINT "BetParticipantCLOSED_pkey";
       public                 neondb_owner    false    230            �           2606    57764 "   BetParticipant BetParticipant_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public."BetParticipant"
    ADD CONSTRAINT "BetParticipant_pkey" PRIMARY KEY (id);
 P   ALTER TABLE ONLY public."BetParticipant" DROP CONSTRAINT "BetParticipant_pkey";
       public                 neondb_owner    false    225            �           2606    57766    Bet Bet_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT "Bet_pkey" PRIMARY KEY (id);
 :   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT "Bet_pkey";
       public                 neondb_owner    false    214            �           2606    57768    Category Category_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);
 D   ALTER TABLE ONLY public."Category" DROP CONSTRAINT "Category_pkey";
       public                 neondb_owner    false    238            �           2606    57770    ChatUsers ChatUsers_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public."ChatUsers"
    ADD CONSTRAINT "ChatUsers_pkey" PRIMARY KEY (id);
 F   ALTER TABLE ONLY public."ChatUsers" DROP CONSTRAINT "ChatUsers_pkey";
       public                 neondb_owner    false    240            �           2606    57772    CourseValuta CourseValuta_pkey 
   CONSTRAINT     `   ALTER TABLE ONLY public."CourseValuta"
    ADD CONSTRAINT "CourseValuta_pkey" PRIMARY KEY (id);
 L   ALTER TABLE ONLY public."CourseValuta" DROP CONSTRAINT "CourseValuta_pkey";
       public                 neondb_owner    false    242            �           2606    57774    GameUserBet GameUserBet_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public."GameUserBet"
    ADD CONSTRAINT "GameUserBet_pkey" PRIMARY KEY (id);
 J   ALTER TABLE ONLY public."GameUserBet" DROP CONSTRAINT "GameUserBet_pkey";
       public                 neondb_owner    false    244            �           2606    57776    GlobalData GlobalData_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public."GlobalData"
    ADD CONSTRAINT "GlobalData_pkey" PRIMARY KEY (id);
 H   ALTER TABLE ONLY public."GlobalData" DROP CONSTRAINT "GlobalData_pkey";
       public                 neondb_owner    false    246            �           2606    57778 "   GlobalUserGame GlobalUserGame_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public."GlobalUserGame"
    ADD CONSTRAINT "GlobalUserGame_pkey" PRIMARY KEY (id);
 P   ALTER TABLE ONLY public."GlobalUserGame" DROP CONSTRAINT "GlobalUserGame_pkey";
       public                 neondb_owner    false    248            �           2606    57780     HeroesControl HeroesControl_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public."HeroesControl"
    ADD CONSTRAINT "HeroesControl_pkey" PRIMARY KEY (id);
 N   ALTER TABLE ONLY public."HeroesControl" DROP CONSTRAINT "HeroesControl_pkey";
       public                 neondb_owner    false    250            �           2606    57782    OrderP2P OrderP2P_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public."OrderP2P"
    ADD CONSTRAINT "OrderP2P_pkey" PRIMARY KEY (id);
 D   ALTER TABLE ONLY public."OrderP2P" DROP CONSTRAINT "OrderP2P_pkey";
       public                 neondb_owner    false    251            �           2606    57784 $   PlayerStatistic PlayerStatistic_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public."PlayerStatistic"
    ADD CONSTRAINT "PlayerStatistic_pkey" PRIMARY KEY (id);
 R   ALTER TABLE ONLY public."PlayerStatistic" DROP CONSTRAINT "PlayerStatistic_pkey";
       public                 neondb_owner    false    254            �           2606    57786    Player Player_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public."Player"
    ADD CONSTRAINT "Player_pkey" PRIMARY KEY (id);
 @   ALTER TABLE ONLY public."Player" DROP CONSTRAINT "Player_pkey";
       public                 neondb_owner    false    253            �           2606    57788    ProductItem ProductItem_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public."ProductItem"
    ADD CONSTRAINT "ProductItem_pkey" PRIMARY KEY (id);
 J   ALTER TABLE ONLY public."ProductItem" DROP CONSTRAINT "ProductItem_pkey";
       public                 neondb_owner    false    258            �           2606    57790    Product Product_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);
 B   ALTER TABLE ONLY public."Product" DROP CONSTRAINT "Product_pkey";
       public                 neondb_owner    false    257            �           2606    57792 0   ReferralUserIpAddress ReferralUserIpAddress_pkey 
   CONSTRAINT     r   ALTER TABLE ONLY public."ReferralUserIpAddress"
    ADD CONSTRAINT "ReferralUserIpAddress_pkey" PRIMARY KEY (id);
 ^   ALTER TABLE ONLY public."ReferralUserIpAddress" DROP CONSTRAINT "ReferralUserIpAddress_pkey";
       public                 neondb_owner    false    261            �           2606    57794    RegPoints RegPoints_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public."RegPoints"
    ADD CONSTRAINT "RegPoints_pkey" PRIMARY KEY (id);
 F   ALTER TABLE ONLY public."RegPoints" DROP CONSTRAINT "RegPoints_pkey";
       public                 neondb_owner    false    263            �           2606    57796    Transfer Transfer_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public."Transfer"
    ADD CONSTRAINT "Transfer_pkey" PRIMARY KEY (id);
 D   ALTER TABLE ONLY public."Transfer" DROP CONSTRAINT "Transfer_pkey";
       public                 neondb_owner    false    265            �           2606    57798    TurnirBet TurnirBet_name_key 
   CONSTRAINT     [   ALTER TABLE ONLY public."TurnirBet"
    ADD CONSTRAINT "TurnirBet_name_key" UNIQUE (name);
 J   ALTER TABLE ONLY public."TurnirBet" DROP CONSTRAINT "TurnirBet_name_key";
       public                 neondb_owner    false    268            �           2606    57800    TurnirBet TurnirBet_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public."TurnirBet"
    ADD CONSTRAINT "TurnirBet_pkey" PRIMARY KEY (id);
 F   ALTER TABLE ONLY public."TurnirBet" DROP CONSTRAINT "TurnirBet_pkey";
       public                 neondb_owner    false    268            �           2606    57802    TurnirPlayer TurnirPlayer_pkey 
   CONSTRAINT     `   ALTER TABLE ONLY public."TurnirPlayer"
    ADD CONSTRAINT "TurnirPlayer_pkey" PRIMARY KEY (id);
 L   ALTER TABLE ONLY public."TurnirPlayer" DROP CONSTRAINT "TurnirPlayer_pkey";
       public                 neondb_owner    false    270            �           2606    57804    Turnir Turnir_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public."Turnir"
    ADD CONSTRAINT "Turnir_pkey" PRIMARY KEY (id);
 @   ALTER TABLE ONLY public."Turnir" DROP CONSTRAINT "Turnir_pkey";
       public                 neondb_owner    false    267            �           2606    57806 "   UpdateDateTime UpdateDateTime_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public."UpdateDateTime"
    ADD CONSTRAINT "UpdateDateTime_pkey" PRIMARY KEY (id);
 P   ALTER TABLE ONLY public."UpdateDateTime" DROP CONSTRAINT "UpdateDateTime_pkey";
       public                 neondb_owner    false    273            �           2606    57808    User User_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);
 <   ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_pkey";
       public                 neondb_owner    false    275            �           1259    57809    Category_name_key    INDEX     Q   CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);
 '   DROP INDEX public."Category_name_key";
       public                 neondb_owner    false    238            �           1259    57810    GlobalUserGame_globalUserId_key    INDEX     o   CREATE UNIQUE INDEX "GlobalUserGame_globalUserId_key" ON public."GlobalUserGame" USING btree ("globalUserId");
 5   DROP INDEX public."GlobalUserGame_globalUserId_key";
       public                 neondb_owner    false    248            �           1259    57811    ProductItem_name_key    INDEX     W   CREATE UNIQUE INDEX "ProductItem_name_key" ON public."ProductItem" USING btree (name);
 *   DROP INDEX public."ProductItem_name_key";
       public                 neondb_owner    false    258            �           1259    57812    Product_name_key    INDEX     O   CREATE UNIQUE INDEX "Product_name_key" ON public."Product" USING btree (name);
 &   DROP INDEX public."Product_name_key";
       public                 neondb_owner    false    257            �           1259    57813    User_cardId_key    INDEX     O   CREATE UNIQUE INDEX "User_cardId_key" ON public."User" USING btree ("cardId");
 %   DROP INDEX public."User_cardId_key";
       public                 neondb_owner    false    275            �           1259    57814    User_email_key    INDEX     K   CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);
 $   DROP INDEX public."User_email_key";
       public                 neondb_owner    false    275            �           1259    57815    User_telegram_key    INDEX     Q   CREATE UNIQUE INDEX "User_telegram_key" ON public."User" USING btree (telegram);
 '   DROP INDEX public."User_telegram_key";
       public                 neondb_owner    false    275                       2606    57816    Bet3 Bet3_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 G   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_categoryId_fkey";
       public               neondb_owner    false    3532    238    215                       2606    57821    Bet3 Bet3_creatorId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_creatorId_fkey";
       public               neondb_owner    false    275    3577    215                       2606    57826    Bet3 Bet3_player1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_player1Id_fkey";
       public               neondb_owner    false    215    3549    253                       2606    57831    Bet3 Bet3_player2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_player2Id_fkey";
       public               neondb_owner    false    215    3549    253                       2606    57836    Bet3 Bet3_player3Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_player3Id_fkey" FOREIGN KEY ("player3Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_player3Id_fkey";
       public               neondb_owner    false    215    3549    253                       2606    57841    Bet3 Bet3_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 F   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_productId_fkey";
       public               neondb_owner    false    3554    215    257                       2606    57846    Bet3 Bet3_productItemId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT "Bet3_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES public."ProductItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 J   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT "Bet3_productItemId_fkey";
       public               neondb_owner    false    215    3557    258            
           2606    57851    Bet4 Bet4_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 G   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_categoryId_fkey";
       public               neondb_owner    false    217    238    3532                       2606    57856    Bet4 Bet4_creatorId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_creatorId_fkey";
       public               neondb_owner    false    217    275    3577                       2606    57861    Bet4 Bet4_player1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_player1Id_fkey";
       public               neondb_owner    false    253    3549    217                       2606    57866    Bet4 Bet4_player2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_player2Id_fkey";
       public               neondb_owner    false    3549    217    253                       2606    57871    Bet4 Bet4_player3Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_player3Id_fkey" FOREIGN KEY ("player3Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_player3Id_fkey";
       public               neondb_owner    false    217    253    3549                       2606    57876    Bet4 Bet4_player4Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_player4Id_fkey" FOREIGN KEY ("player4Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_player4Id_fkey";
       public               neondb_owner    false    253    3549    217                       2606    57881    Bet4 Bet4_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 F   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_productId_fkey";
       public               neondb_owner    false    3554    217    257                       2606    57886    Bet4 Bet4_productItemId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT "Bet4_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES public."ProductItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 J   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT "Bet4_productItemId_fkey";
       public               neondb_owner    false    217    3557    258                       2606    57891 %   BetCLOSED3 BetCLOSED3_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 S   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_categoryId_fkey";
       public               neondb_owner    false    3532    238    220                       2606    57896 $   BetCLOSED3 BetCLOSED3_creatorId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_creatorId_fkey";
       public               neondb_owner    false    275    220    3577                       2606    57901 $   BetCLOSED3 BetCLOSED3_player1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_player1Id_fkey";
       public               neondb_owner    false    253    3549    220                       2606    57906 $   BetCLOSED3 BetCLOSED3_player2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_player2Id_fkey";
       public               neondb_owner    false    3549    220    253                       2606    57911 $   BetCLOSED3 BetCLOSED3_player3Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_player3Id_fkey" FOREIGN KEY ("player3Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_player3Id_fkey";
       public               neondb_owner    false    3549    253    220                       2606    57916 $   BetCLOSED3 BetCLOSED3_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 R   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_productId_fkey";
       public               neondb_owner    false    3554    220    257                        2606    57921 (   BetCLOSED3 BetCLOSED3_productItemId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT "BetCLOSED3_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES public."ProductItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 V   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT "BetCLOSED3_productItemId_fkey";
       public               neondb_owner    false    3557    220    258            "           2606    57926 %   BetCLOSED4 BetCLOSED4_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 S   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_categoryId_fkey";
       public               neondb_owner    false    222    238    3532            #           2606    57931 $   BetCLOSED4 BetCLOSED4_creatorId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_creatorId_fkey";
       public               neondb_owner    false    222    3577    275            $           2606    57936 $   BetCLOSED4 BetCLOSED4_player1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_player1Id_fkey";
       public               neondb_owner    false    253    222    3549            %           2606    57941 $   BetCLOSED4 BetCLOSED4_player2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_player2Id_fkey";
       public               neondb_owner    false    222    253    3549            &           2606    57946 $   BetCLOSED4 BetCLOSED4_player3Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_player3Id_fkey" FOREIGN KEY ("player3Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_player3Id_fkey";
       public               neondb_owner    false    222    3549    253            '           2606    57951 $   BetCLOSED4 BetCLOSED4_player4Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_player4Id_fkey" FOREIGN KEY ("player4Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_player4Id_fkey";
       public               neondb_owner    false    222    3549    253            (           2606    57956 $   BetCLOSED4 BetCLOSED4_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 R   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_productId_fkey";
       public               neondb_owner    false    3554    222    257            )           2606    57961 (   BetCLOSED4 BetCLOSED4_productItemId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT "BetCLOSED4_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES public."ProductItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 V   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT "BetCLOSED4_productItemId_fkey";
       public               neondb_owner    false    3557    222    258                       2606    57966 #   BetCLOSED BetCLOSED_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT "BetCLOSED_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 Q   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT "BetCLOSED_categoryId_fkey";
       public               neondb_owner    false    3532    219    238                       2606    57971 "   BetCLOSED BetCLOSED_creatorId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT "BetCLOSED_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 P   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT "BetCLOSED_creatorId_fkey";
       public               neondb_owner    false    3577    219    275                       2606    57976 "   BetCLOSED BetCLOSED_player1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT "BetCLOSED_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 P   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT "BetCLOSED_player1Id_fkey";
       public               neondb_owner    false    3549    253    219                       2606    57981 "   BetCLOSED BetCLOSED_player2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT "BetCLOSED_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 P   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT "BetCLOSED_player2Id_fkey";
       public               neondb_owner    false    253    3549    219                       2606    57986 "   BetCLOSED BetCLOSED_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT "BetCLOSED_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 P   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT "BetCLOSED_productId_fkey";
       public               neondb_owner    false    219    257    3554                       2606    57991 &   BetCLOSED BetCLOSED_productItemId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT "BetCLOSED_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES public."ProductItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 T   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT "BetCLOSED_productItemId_fkey";
       public               neondb_owner    false    258    3557    219            -           2606    57996 *   BetParticipant3 BetParticipant3_betId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipant3"
    ADD CONSTRAINT "BetParticipant3_betId_fkey" FOREIGN KEY ("betId") REFERENCES public."Bet3"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 X   ALTER TABLE ONLY public."BetParticipant3" DROP CONSTRAINT "BetParticipant3_betId_fkey";
       public               neondb_owner    false    215    3509    226            .           2606    58001 +   BetParticipant3 BetParticipant3_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipant3"
    ADD CONSTRAINT "BetParticipant3_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 Y   ALTER TABLE ONLY public."BetParticipant3" DROP CONSTRAINT "BetParticipant3_userId_fkey";
       public               neondb_owner    false    275    3577    226            /           2606    58006 *   BetParticipant4 BetParticipant4_betId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipant4"
    ADD CONSTRAINT "BetParticipant4_betId_fkey" FOREIGN KEY ("betId") REFERENCES public."Bet4"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 X   ALTER TABLE ONLY public."BetParticipant4" DROP CONSTRAINT "BetParticipant4_betId_fkey";
       public               neondb_owner    false    228    3511    217            0           2606    58011 +   BetParticipant4 BetParticipant4_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipant4"
    ADD CONSTRAINT "BetParticipant4_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 Y   ALTER TABLE ONLY public."BetParticipant4" DROP CONSTRAINT "BetParticipant4_userId_fkey";
       public               neondb_owner    false    275    228    3577            3           2606    58016 =   BetParticipantCLOSED3 BetParticipantCLOSED3_betCLOSED3Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipantCLOSED3"
    ADD CONSTRAINT "BetParticipantCLOSED3_betCLOSED3Id_fkey" FOREIGN KEY ("betCLOSED3Id") REFERENCES public."BetCLOSED3"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 k   ALTER TABLE ONLY public."BetParticipantCLOSED3" DROP CONSTRAINT "BetParticipantCLOSED3_betCLOSED3Id_fkey";
       public               neondb_owner    false    220    3515    231            4           2606    58021 7   BetParticipantCLOSED3 BetParticipantCLOSED3_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipantCLOSED3"
    ADD CONSTRAINT "BetParticipantCLOSED3_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 e   ALTER TABLE ONLY public."BetParticipantCLOSED3" DROP CONSTRAINT "BetParticipantCLOSED3_userId_fkey";
       public               neondb_owner    false    275    3577    231            5           2606    58026 =   BetParticipantCLOSED4 BetParticipantCLOSED4_betCLOSED4Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipantCLOSED4"
    ADD CONSTRAINT "BetParticipantCLOSED4_betCLOSED4Id_fkey" FOREIGN KEY ("betCLOSED4Id") REFERENCES public."BetCLOSED4"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 k   ALTER TABLE ONLY public."BetParticipantCLOSED4" DROP CONSTRAINT "BetParticipantCLOSED4_betCLOSED4Id_fkey";
       public               neondb_owner    false    222    233    3517            6           2606    58031 7   BetParticipantCLOSED4 BetParticipantCLOSED4_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipantCLOSED4"
    ADD CONSTRAINT "BetParticipantCLOSED4_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 e   ALTER TABLE ONLY public."BetParticipantCLOSED4" DROP CONSTRAINT "BetParticipantCLOSED4_userId_fkey";
       public               neondb_owner    false    3577    233    275            1           2606    58036 :   BetParticipantCLOSED BetParticipantCLOSED_betCLOSEDId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipantCLOSED"
    ADD CONSTRAINT "BetParticipantCLOSED_betCLOSEDId_fkey" FOREIGN KEY ("betCLOSEDId") REFERENCES public."BetCLOSED"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 h   ALTER TABLE ONLY public."BetParticipantCLOSED" DROP CONSTRAINT "BetParticipantCLOSED_betCLOSEDId_fkey";
       public               neondb_owner    false    3513    219    230            2           2606    58041 5   BetParticipantCLOSED BetParticipantCLOSED_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipantCLOSED"
    ADD CONSTRAINT "BetParticipantCLOSED_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 c   ALTER TABLE ONLY public."BetParticipantCLOSED" DROP CONSTRAINT "BetParticipantCLOSED_userId_fkey";
       public               neondb_owner    false    230    3577    275            +           2606    58046 (   BetParticipant BetParticipant_betId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipant"
    ADD CONSTRAINT "BetParticipant_betId_fkey" FOREIGN KEY ("betId") REFERENCES public."Bet"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 V   ALTER TABLE ONLY public."BetParticipant" DROP CONSTRAINT "BetParticipant_betId_fkey";
       public               neondb_owner    false    225    3507    214            ,           2606    58054 )   BetParticipant BetParticipant_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetParticipant"
    ADD CONSTRAINT "BetParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 W   ALTER TABLE ONLY public."BetParticipant" DROP CONSTRAINT "BetParticipant_userId_fkey";
       public               neondb_owner    false    225    275    3577            �           2606    58059    Bet Bet_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT "Bet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 E   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT "Bet_categoryId_fkey";
       public               neondb_owner    false    238    214    3532            �           2606    58064    Bet Bet_creatorId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT "Bet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 D   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT "Bet_creatorId_fkey";
       public               neondb_owner    false    3577    214    275            �           2606    58069    Bet Bet_player1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT "Bet_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 D   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT "Bet_player1Id_fkey";
       public               neondb_owner    false    3549    214    253            �           2606    58074    Bet Bet_player2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT "Bet_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Player"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 D   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT "Bet_player2Id_fkey";
       public               neondb_owner    false    253    214    3549            �           2606    58079    Bet Bet_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT "Bet_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 D   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT "Bet_productId_fkey";
       public               neondb_owner    false    214    3554    257                        2606    58084    Bet Bet_productItemId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT "Bet_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES public."ProductItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 H   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT "Bet_productItemId_fkey";
       public               neondb_owner    false    214    258    3557            7           2606    58089 #   ChatUsers ChatUsers_chatUserId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."ChatUsers"
    ADD CONSTRAINT "ChatUsers_chatUserId_fkey" FOREIGN KEY ("chatUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 Q   ALTER TABLE ONLY public."ChatUsers" DROP CONSTRAINT "ChatUsers_chatUserId_fkey";
       public               neondb_owner    false    240    275    3577            8           2606    58094 '   GameUserBet GameUserBet_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."GameUserBet"
    ADD CONSTRAINT "GameUserBet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 U   ALTER TABLE ONLY public."GameUserBet" DROP CONSTRAINT "GameUserBet_categoryId_fkey";
       public               neondb_owner    false    244    238    3532            9           2606    58099 +   GameUserBet GameUserBet_gameUserBet1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."GameUserBet"
    ADD CONSTRAINT "GameUserBet_gameUserBet1Id_fkey" FOREIGN KEY ("gameUserBet1Id") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 Y   ALTER TABLE ONLY public."GameUserBet" DROP CONSTRAINT "GameUserBet_gameUserBet1Id_fkey";
       public               neondb_owner    false    275    3577    244            :           2606    58104 +   GameUserBet GameUserBet_gameUserBet2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."GameUserBet"
    ADD CONSTRAINT "GameUserBet_gameUserBet2Id_fkey" FOREIGN KEY ("gameUserBet2Id") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 Y   ALTER TABLE ONLY public."GameUserBet" DROP CONSTRAINT "GameUserBet_gameUserBet2Id_fkey";
       public               neondb_owner    false    3577    275    244            ;           2606    58109 &   GameUserBet GameUserBet_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."GameUserBet"
    ADD CONSTRAINT "GameUserBet_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 T   ALTER TABLE ONLY public."GameUserBet" DROP CONSTRAINT "GameUserBet_productId_fkey";
       public               neondb_owner    false    3554    257    244            <           2606    58114 *   GameUserBet GameUserBet_productItemId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."GameUserBet"
    ADD CONSTRAINT "GameUserBet_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES public."ProductItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 X   ALTER TABLE ONLY public."GameUserBet" DROP CONSTRAINT "GameUserBet_productItemId_fkey";
       public               neondb_owner    false    258    244    3557            =           2606    58119 /   GlobalUserGame GlobalUserGame_globalUserId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."GlobalUserGame"
    ADD CONSTRAINT "GlobalUserGame_globalUserId_fkey" FOREIGN KEY ("globalUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 ]   ALTER TABLE ONLY public."GlobalUserGame" DROP CONSTRAINT "GlobalUserGame_globalUserId_fkey";
       public               neondb_owner    false    275    3577    248            >           2606    58124 &   OrderP2P OrderP2P_orderP2PUser1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."OrderP2P"
    ADD CONSTRAINT "OrderP2P_orderP2PUser1Id_fkey" FOREIGN KEY ("orderP2PUser1Id") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 T   ALTER TABLE ONLY public."OrderP2P" DROP CONSTRAINT "OrderP2P_orderP2PUser1Id_fkey";
       public               neondb_owner    false    251    275    3577            ?           2606    58129 &   OrderP2P OrderP2P_orderP2PUser2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."OrderP2P"
    ADD CONSTRAINT "OrderP2P_orderP2PUser2Id_fkey" FOREIGN KEY ("orderP2PUser2Id") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 T   ALTER TABLE ONLY public."OrderP2P" DROP CONSTRAINT "OrderP2P_orderP2PUser2Id_fkey";
       public               neondb_owner    false    251    275    3577            A           2606    58134 /   PlayerStatistic PlayerStatistic_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."PlayerStatistic"
    ADD CONSTRAINT "PlayerStatistic_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id);
 ]   ALTER TABLE ONLY public."PlayerStatistic" DROP CONSTRAINT "PlayerStatistic_categoryId_fkey";
       public               neondb_owner    false    238    254    3532            B           2606    58139 -   PlayerStatistic PlayerStatistic_playerId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."PlayerStatistic"
    ADD CONSTRAINT "PlayerStatistic_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Player"(id);
 [   ALTER TABLE ONLY public."PlayerStatistic" DROP CONSTRAINT "PlayerStatistic_playerId_fkey";
       public               neondb_owner    false    254    3549    253            C           2606    58144 -   PlayerStatistic PlayerStatistic_turnirId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."PlayerStatistic"
    ADD CONSTRAINT "PlayerStatistic_turnirId_fkey" FOREIGN KEY ("turnirId") REFERENCES public."TurnirBet"(id);
 [   ALTER TABLE ONLY public."PlayerStatistic" DROP CONSTRAINT "PlayerStatistic_turnirId_fkey";
       public               neondb_owner    false    3569    268    254            @           2606    58149    Player Player_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Player"
    ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 G   ALTER TABLE ONLY public."Player" DROP CONSTRAINT "Player_userId_fkey";
       public               neondb_owner    false    253    275    3577            D           2606    58154 ?   ReferralUserIpAddress ReferralUserIpAddress_referralUserId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."ReferralUserIpAddress"
    ADD CONSTRAINT "ReferralUserIpAddress_referralUserId_fkey" FOREIGN KEY ("referralUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 m   ALTER TABLE ONLY public."ReferralUserIpAddress" DROP CONSTRAINT "ReferralUserIpAddress_referralUserId_fkey";
       public               neondb_owner    false    261    275    3577            E           2606    58159 (   RegPoints RegPoints_regPointsUserId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."RegPoints"
    ADD CONSTRAINT "RegPoints_regPointsUserId_fkey" FOREIGN KEY ("regPointsUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 V   ALTER TABLE ONLY public."RegPoints" DROP CONSTRAINT "RegPoints_regPointsUserId_fkey";
       public               neondb_owner    false    275    263    3577            F           2606    58164 &   Transfer Transfer_transferUser1Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Transfer"
    ADD CONSTRAINT "Transfer_transferUser1Id_fkey" FOREIGN KEY ("transferUser1Id") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 T   ALTER TABLE ONLY public."Transfer" DROP CONSTRAINT "Transfer_transferUser1Id_fkey";
       public               neondb_owner    false    3577    265    275            G           2606    58169 &   Transfer Transfer_transferUser2Id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Transfer"
    ADD CONSTRAINT "Transfer_transferUser2Id_fkey" FOREIGN KEY ("transferUser2Id") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 T   ALTER TABLE ONLY public."Transfer" DROP CONSTRAINT "Transfer_transferUser2Id_fkey";
       public               neondb_owner    false    3577    275    265            H           2606    58174 '   TurnirPlayer TurnirPlayer_turnirId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."TurnirPlayer"
    ADD CONSTRAINT "TurnirPlayer_turnirId_fkey" FOREIGN KEY ("turnirId") REFERENCES public."Turnir"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 U   ALTER TABLE ONLY public."TurnirPlayer" DROP CONSTRAINT "TurnirPlayer_turnirId_fkey";
       public               neondb_owner    false    267    270    3565            I           2606    58179 %   TurnirPlayer TurnirPlayer_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."TurnirPlayer"
    ADD CONSTRAINT "TurnirPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 S   ALTER TABLE ONLY public."TurnirPlayer" DROP CONSTRAINT "TurnirPlayer_userId_fkey";
       public               neondb_owner    false    270    3577    275                       2606    58184    Bet fk_turnir_bet    FK CONSTRAINT     ~   ALTER TABLE ONLY public."Bet"
    ADD CONSTRAINT fk_turnir_bet FOREIGN KEY ("turnirBetId") REFERENCES public."TurnirBet"(id);
 =   ALTER TABLE ONLY public."Bet" DROP CONSTRAINT fk_turnir_bet;
       public               neondb_owner    false    3569    268    214            	           2606    58189    Bet3 fk_turnir_bet3    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet3"
    ADD CONSTRAINT fk_turnir_bet3 FOREIGN KEY ("turnirBetId") REFERENCES public."TurnirBet"(id);
 ?   ALTER TABLE ONLY public."Bet3" DROP CONSTRAINT fk_turnir_bet3;
       public               neondb_owner    false    268    3569    215                       2606    58194    Bet4 fk_turnir_bet4    FK CONSTRAINT     �   ALTER TABLE ONLY public."Bet4"
    ADD CONSTRAINT fk_turnir_bet4 FOREIGN KEY ("turnirBetId") REFERENCES public."TurnirBet"(id);
 ?   ALTER TABLE ONLY public."Bet4" DROP CONSTRAINT fk_turnir_bet4;
       public               neondb_owner    false    217    3569    268                       2606    58199    BetCLOSED fk_turnir_bet_closed    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED"
    ADD CONSTRAINT fk_turnir_bet_closed FOREIGN KEY ("turnirBetId") REFERENCES public."TurnirBet"(id);
 J   ALTER TABLE ONLY public."BetCLOSED" DROP CONSTRAINT fk_turnir_bet_closed;
       public               neondb_owner    false    268    219    3569            !           2606    58204     BetCLOSED3 fk_turnir_bet_closed3    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED3"
    ADD CONSTRAINT fk_turnir_bet_closed3 FOREIGN KEY ("turnirBetId") REFERENCES public."TurnirBet"(id);
 L   ALTER TABLE ONLY public."BetCLOSED3" DROP CONSTRAINT fk_turnir_bet_closed3;
       public               neondb_owner    false    268    220    3569            *           2606    58209     BetCLOSED4 fk_turnir_bet_closed4    FK CONSTRAINT     �   ALTER TABLE ONLY public."BetCLOSED4"
    ADD CONSTRAINT fk_turnir_bet_closed4 FOREIGN KEY ("turnirBetId") REFERENCES public."TurnirBet"(id);
 L   ALTER TABLE ONLY public."BetCLOSED4" DROP CONSTRAINT fk_turnir_bet_closed4;
       public               neondb_owner    false    222    3569    268            �           826    16389     DEFAULT PRIVILEGES FOR SEQUENCES    DEFAULT ACL     {   ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;
          public               cloud_admin    false    5            �           826    16388    DEFAULT PRIVILEGES FOR TABLES    DEFAULT ACL     �   ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO neon_superuser WITH GRANT OPTION;
          public               cloud_admin    false    5            �      x������ � �      �      x������ � �      �   �   x�����1EϞ*�"�;N&��uw�L��8�4���Ԑt���e�+��r���dB�H���-qM�h��c��7M%SIF�>#������OZ�Ԇڹ���mn�����]�����a+��QP�r���ǻ`W�K��mF1�z�C��?�	R���O��$��?E�ȡ��P�(���R�^0�a�ob      �   �  x�}XK��6\K���E���6�.�,���ϑnH�W���!?M�� #���I�M,J��f��j�:>R���:6)S����hn��K��M������?~߰�&��j�xU}��;��K�m�����VZ��߿v� 5��-�K|�7��� D�e:���1�^|��Sd�&߰�������8�iG��k)A���mW��7&i�U�	'������������
Ύ�z�ޟv�#�ဪ���H���Q�ZOH���C����{�5G��e��y���|I0@�����v�V�<q�A �bs-~ ��`{���&�^��(m�Dט��q04�PY샀�K2�m�7�H�%p/ն��HƐG��MKu)��8 �?��p\gu�C�/�C����z(��D�/dCI���z��:�c�9CQ�t �6��������K��z�ףF�u5��^fA!a�vTH�
sb�w��0�ֵ��Se�Cq��Kp�����H��C�%��f�����L�6ol��� ����)'�)�4��ƴ��T��"�VG�?N�Ti����5#��)��Ь�Zq9�4IX�Zr]K�u�����ë��/�g;=$�ޠ���T͊0$�E�n���P@�X�E�{:_Πe�:S�{�T)��ŢQ�+T��C�ާ&89e���5x�G������S���SQ�E���皮�)Hy+����HG!�0Qc��C�
?;���~'"l��z��2ߺ	gك���j�v�\0�pD���Q[���.�x���R�Z�t��7`���s �!R�Ȑ�t�vl���(�R9p��{'*�/9n�4ahA��M{�;�s~��@HyS�]��oD��#�0����d(g�8��I��y����;�]�Ⱥ��.mCF��<��
U\
k�]y�2΄�B"A=]3�g��/h�}�#���x��;*ˉę�3C��M0�&*��؏�ݱ��5ۆ���Q��R���;��yKƌ�Tj3�{#F�)����Do1�ا7����pe�m�=��n���%u!�n,���\9���'�M�w�W&���%,Akt��ș��ʲV�.�N��Zevk����%r���a� )�ȱw�ڤJ����y<e�<#M���"���*��\(&�4j7�$�3�����x��'u�S�{�R([�%V������������������6v��-;�ȎQo�TjK7�-�F�u�ϓ�*��N��}ˮ��.i���5v@ �.PRD6�	�9�s~A�2�yh!�<���E�
/����		G�l��;-��񵰃q�Alja�فՇ��y���!��V閑;�E�^z�?"�/��@'^�����5���O��G�)�Bʂ����8�ZI8�۹�Z�뵴�����P%ڊ���gO:�������jF���$�dr~A�Z������ʵ
�6>��s��lͺ5�G��b�쎂,
���b����/A���A��$lM�*&�%��_�ЂR��>! �٪�/vv��6_�v�>�q�Q�T
j<�lds4OR%��m̪|#��s�xdw���])���,]��A�>G����ʑp�$�l�0�_���	K@g���/v�(�L1v���pc)e���������O,��g-����X��!����y�
�
0�w�%�qJ��#��3�ד7|�߮��CگE�=;�`�����L}c���������e�������      �      x������ � �      �   �   x�m�;n1D��)�K��&p���Ô� %����`��(C����~i��f×�� 4�YRzu�����E�t*頞|�/�o\U+k�l;�&:�&e�k/�ɘ~LMr����@(,�鰑�v�� ��8��E-E]#�"k?J.�u��JW".3Q�
Q�?������1�H���}S��ﱬLڕZk7�OAS      �      x������ � �      �      x������ � �      �   -  x����j�0��ڧ�d�_Yҭ��Jz+������Pdhbc��ٵ/Z��/��-*R�8��|�_/o���,~�8�ن�(�"��вlE�9 & T��xkz���H�X2(}��j�ǁ>`1(w�׼��
��>Q@wR)��7 �y{mxrtR]�0�.�Qz :[B�\�o��M����H}̹�����H����`�87�@<^�zRbñ��}?�{<������ah!*��B����St8|JH�`�F�I��[�� &�4�g7��� ���Q	j'��2K�R鋉��_��      �   �  x��Zˎ$�<��b~`�z�ma�m�ɀ���?AeUK]R�x1�Y�=�QE�T�%������o�����c�����s������^4��m?$>T�}
�兑/��\�G����C�O��O�x#�U�%��+�.^�7|�D����=X.�}�ѥMM��_�k��O���k܃�G�GH�A������]�������=Py�+�����ƗU)�M�J�����~v����3<Ux(xŲ
�S��'�GĞ��ڲ,���~�C��:��U�V}����#n_(��	�%s�=�ͩ�r�Jvp�NqH���T����W��a��~2)G�/�:�1Z���3�������k����ҝpu:�#��&�8_���(h��+�!z�����P����9Yd����V�l��2�Eq��D�� ���r�͠�K�%���j�m����h�|�IA�F���;<U�O��{��ڕf��ƫrﲅ����_��V��=�agfͷ5����Bn�F�r�ˠM�� W�y�Aa�����᣺S�V��w4a�@��|FI�ca�k�)�μ�8�O�A���4Nv<sA�0$5%�Ze��7���!,-��y�Ӌ'}�~�_0CQJ��U6�L�o�}� _�3���n�W�5
F�eں�#HS�2������A�����^?-LTZ<rK�bQ�-�����:=���ZԘ ]I�t_,�0,BUG���"�`]);ؐ�t�Mj���ye6�q��($k~sQ�ޱ�`�����3
­:Ԭ2��<e$8��*J�>Jo��JM��Rs���V�P"7��7�@�E.2'-f�Tj4u�n��<�dQ�{�Qy�w�g�d`�����3�Ȍe¡ˉ�
�Y҉EF��[��!��Q6v����3����t�ނ�YnQ���jȁ]\�|y����5
�;����
��,POp�:߲�R���F$�����+�-M���ک%Km.��#��HY�h�N���T�mZ�I������b�{Nyk �Ҝ kHk�k�
�H�<��� �5U�a��l?ŴJ�N����|�ɘ|�Q��=`��f&8�Dݥ��	e2�*�N��b�P��h5e��e�JA��TC+�+D��RH�NA�����%����R��譫 Qz9���k�H =���@��\�>�����_�@.�W�%�9a���#Z�.�-����Crc�.,.벼|/�e5d�����;��}[\6��DʈvV���"I2c�,��v�{��-�΃���Lbm2���r^�F�Bĉ���У}W(�`�X�$���0#m�r�:;p�D�Ph�\'���j�4�-Z�N�1 � ��-��x�S�6lY��}�]F���$��m� ���'�����Y��>p�����+�@h�?��V\b}(T8[.�X�ƻmT0���0�$��t"��ȓ�*	�������˝�Ho���ڎ6u.0Aܔ��$���p�a�3P��A��7�Ŧ�N�W��ߐ	��eK���U�4�(�	D	��ڱ&����%��(�7�mTh��]�b�E�I�H��"�
8�-��I���+�|��q�,��-� �iG��M�P���}���4f�/wC�߮l�!�KwU���T}�J82fd�<��5��UߍR����o�#�����iv(�FK��Ȭ�Ɖ%����)�:m�̉�.��n���4C��.��Li�_���V�L��"�.� a���[3o�4q��멫e�{6v�x���*���+�Xi�jQ`�]�<!8�B��|w�Ps�~6%w��^��/���=rÊ٦�xvS��?YVlN��)�fD[�VT�n��xJ�'Z�X�5Ym��U�"�YAY>sڗOK��xL/l5����WA�ĵ��cX�$�md�i�3|>�Ĝ��m	�J�I"�$���6�<f@���Z^�R�Ǌ��uD�6���(�y+��'�s�<���@�n�N*[�Y;�
VXgHDv�Ĳ��ۛ��@���z[Ͳ�n樖٭�P[!�g�r����U,V���	�V�~�6���4:��u>Lc�T�kA��Q"3<��<����N5�e|ZMe�q���q��L��A�qe�*!;H���I?Cٙ��y��S��$~�*}[U3٘�l���qu�����@'Wkw�S�7�Fs��;u��
��� �ޡ��h("�
�9e�����#̪3��/�����z�?��9�V�f�(Y��������U�Ͱ�ZG���,woyͪ5��6d6�lR)5����6`\��t�<M,��&*����?��	��<Q§�o�Nm�U@Ѐ�O4h��X��K�PB/�BĮ}<+3��ȧ��$NRiƀm�J!n �rW��bk��vu����^}�ǯ�j���<U�!��Jf�^oG�\��I<Ax6� u�'I��W7�9࡫�
��"
�䣤}A��z��a���=&M�X�I��:���}��,�Ť�V~<y:��(����m���FmC�+pK�����;m񷜝�q^uK��D�<"o��$�X6V�<1	�����@�d��k(`�e���D	��y���¼��Z��8��SfQ3�g4�"G�y�@j��)&Ԧ)���
�cH���x�1��Hov�ŃT�.a��"J膕�0�l��vY��k:1̍���!LǓaX����İϐ]�H������\�[x�ts���0����@鱉��=7
���5��,�1W��8���͗������˦E�1+g�����o�2���=K1����o��
X�̵�N6|r��^mf�_�ؙU��0�']:K�J=�w�Y--���Q���m^�����b3��؀�%^(��.���l�q@���-�V��.<�
#�|����2[�(>����qt�O1�&j:��l��ɇ�֗:փ�(��ء�ĸ=g��D��g>�Kɷ��k2���Fw�Ū|֊ǧ,��)]j?�5�18��k��q� SN: �j`��[6ic�NZMc3C]��!xq���h�;�k
l�6V[, 	;�ޱ1�Q�A��9m�.��Cǩ	���`0���'MJc�j�=2`�YB��!/_`��0E
껾aF��ZJ�A��L��.��9�ղ<z����Sl���G�`��K��Ԁb#W�(#�t���7���N��Nj��	I?�' v�� d)�"�%�0�=����~�4�<���O��&c!rQ!#IR����7�@�yR���������U���� ���]������N5�ՄS'�ww�ㅗ�Q�T���q\]�,v8i��!a<�����;3De95�����CH)�$��W�`cf���+;�	S�����h��Q��{	=5�a� �a���fO/��ȧ_�i�o��38)F      �      x������ � �      �   C  x���INAE��)r�Xk���"�`�Ěpa7 :d@i�*%���<�^����C������rx�w�=۞c'�H,1h�����{vL�|֪�(ma#E�P�E�n��RG҂���u^���AW\@o�Wa��,Q��0Nd	��̠�:X!`�T�%	�
$����-}��Y��r�ňSy���ľ!he�3&�kQ��K'����5h�ʚF���6D�z���0kѪ�PI8�㟺Q�x�$i��v_sVM燠�_������,dV�����Nw�+MW=�yn�W:i���9�KV�")��?/�      �   �   x�M��N�0��;O�(�i�K�*$�ą�R�֊$;ѧ��z��>if���mΪM1gT�0�[�*b0��,��ƚXq�P�}}B�{5��:��U��CƎ�K������$y3u�q��6�Oq#xE}̓��pMϣM��xM�f��K�����бU��NWpS���5�т��$�����L�àZ���VbM,      �      x������ � �      �   G   x�-���@�sR�6�Ȏ�R��B�Foh�2&�!ŷH;�[�(�T�`O5����
r��ܹT~��?a��      �      x������ � �      �   �
  x��[[v!�n�"H�$�����/a���6E�t;�͕@op|�#�O������G�~��;�_!�!�R��l�����_�C�׭���oT_Z��Q˸:�Y�J�N��V�rf�
��6�Q�7N�.+C8�Nڢ�q>�մ�xZ^~�e�Gي�N�]�<�Vu�i�}�d����.���f8��K[w�o�&�3�$���]�b����V�7ƭ]G�v��	Ft�Rꅵp�����P��f��qR[0I�ŭV��?��l��i�}�d�F�Rvr��E�b�<J7�4é����Ϻ�A�'�gL�I��n����J.�G����$�p�����%�e�M�(�'l����C���3�8|$nܹl!�N�{�~B�e��G�BQ�w�'�2�X���;=\p�ڟ������:��>��v�
�x\f8�|"��K�,�Nz�ns����+��pb�H���N`�t���ƭ�|�\�=d��!�NlI�ۡ����8Ym�,f�*�H̜)�X������"t#�.a^p���H��W	l�$�lpL��۹�p�����j%��:�	��=���?������I޴C�`<�I���Z�aE�f�@7�y�׏FD�%�p�/��V��+9���I�P��p�X<x[�u����8��v�c� ��4���j^�r�NZW�؅C"+3����8q�k�-�hA�]~�m��?XTw��GDf8i�}�k[�ُ�yr�Q�ȃv!\�-�NQ?=_�Ҷ�p��pp��9�xpo�bs�Я��-���l�j�2n�'�+U?i��Jҥx��E��#v��}d4�\����6���'�2�)��eN^����;��K�3�)���S,�ȌL\�&�k���)iS
��PHޓ��!Ca3nIn�aA��3�b�$U��A��ٓ�$X�ѩ���j1���p�� <��K��_΁�Dr�[)y��}i7�E#N�4�	N�u_[��.��ֻ?^-GQ�C�,3�Z�[�8j���$�f�X�S�F�+�)����h�ڨ'�/zр\,�g8a�U��wN�,k>�ř�N)�2��	�َ�*���A�����'D���P��pB�B� �q�g8e��27�b?����q��������yx+𣂡�G�8r��e#;Q�@�R��,kh��u����� ~8p�E�z��>�g8�ÝS���PҖ�����]D��:�r�vyT�棔��'�r�nq}�ztK�N��-��|6���)�_U�4�)���!�N���~W��MӋ���&W�V>�G��N���%��̇{�B���4'f�!hz�X?"'�~�[���囕4é���h~%�\f8[a@H(�6:é�i��`�:é�5DM�[#��R��b2éԯ�CCH�Z��n�/io��<��Y��p�|�˅��;	>��u��S�+��~y����p��>�YF}����-��p�O�n�t�<J{�/��!��r���j��a�v�>�9�gTL�چH���3���F���}�Æ�3��%�@7�����	[jWmKqK9�p��߱y���%8�T�ciW}�9����OWꓮ��N���N3tzG�޳��t��)�p_R�`��?��Z���e���G+�+�B�I>ڐ&V~�`�~S�/�L˝N�Y�`c�� �FG��q�
�I���f�K��EO��I}���!��w�*R�>)���a���N�D���6�zFX�R,�)ت�� �H���|�p,g��I�$I7����E�Si.3��eM��M�;�3MҲ&�m�����&������s�Ĳ��8k�}��a��p���f_ީ��zWI06�Q�nz�$�c<�eG%�g8)ˊ��@��3G��"�#�4��#��"�h�֝qhR�5A�|9�'�ѦGDtޞR�?�|ҕF��Uk@��o�86+������0��xl��,�KY>��m��7����,>�j�1`���Wg8�w��o��-z>��AQ���ۭ0���I\�C����쌓߆�p�r5�E�)~!����"�QY��6�7�3E��U�˻%��E�_)�/ڜ �~xơ������	�g�'�V�5-��T��ii+F��3���Y3܀�y��"/P���������-�V�&��〃��Q�y���q�KX�P���s�&'�!�>�X�^�7�^��pp�%��`�Yf88��r�r�tá��Z�FS���%Ɵ��Ű�ZzV��H����m��(ַ���_��I�ni��5��i���y�$ԝڝEn��/O���'\I�]Ǣm�:�I�oE� ��j���&�~���=Y����-88�G�;����N�������rNIf8y�P�׾�����I�m�;E����&}��o94���ݐ�`B5�$o$���I��ZQ��E�A"�ٲ�U��|��Lp�4?GR�,�T�a�5?r�p�_�.=�'����]�j˦�7�3���۟N�ֽd8�`ȷ�\�CW
�{�Xa@e����["i���Դ�p��U�� �q��7Nla�D���j7cp���$��b�Y���/��QFi��X\�I\%��l9�9H|��'�������ߘ�ĝZ�ކ�6�A�$�����
I3$�Jb��<��3��F���7
˘f8H�s����0�b���jR�� )$�IQP�w���I]#y]���g����� ;��      �      x������ � �      �   +   x�3�L�B##S]#]#C+Sc+=3C\�\1z\\\ ���      �   S  x���nG���O1�H�0g~vv�.n�ǉ��Eb����?!$T��PKU��
�m� ����+�$=�N��^��HM"���f�zvΜsf�;��]S����R�:5U!DX�R��fyu���r�ʍ����+__[i�1& ./�/�|v#}m@[��fb��ڙD*h.I�,ɤi��MP��7�k+��W����$;U�^��t��۫�2;�]q�����/cm���W'��Kz�Y��������Ks׾*��?��ن����ugō�Y����[��?�8����'�Y��c���6�*v�i�?W��f����V'�� �jۇ3�BHg��EujT�T�J��������_8=�o��~��3�*��4+2���o����?~���ʫ����|�o����_�5(k��-��ŅW�]�����������w����E���OP�/N�P���İ�fv;��������v3�:�Q������>��xc}ymrq�r�	�eB#E
#g�ZɄ<#]�����`"xU	7�.a�����V�ٰ(k ͇6�¢o�� ��T����Qy��=}ݚ�ɾ�l�ڏШ^��f+��c��o��(BC�D�q	z`W�u}��U�/V�,��?�����ќ��J�"A�#k���������U�/:{ꐦ�q�r��-5wǅڹ�aÜ�*'��$kuҢ�mǡ���Ba/�ѫ�	�f�?�����FX����v{��~:��΢�Vkeհ�D�Z���? �BX0a(uܩ#�d���l���`-Nvl���[��f�����F����Ҍ9.qؐ�P�\�-ORi��>�2DYDYDYDYDYDYDYDYDY�Q�L��8@�R��cI�,�,�,�,�,�,�,�,��Q��I\ Y���#E�E�E�E�E�E�E�E�E�u��Jp��e9nm��,�,�,�,�,�,�,�,��Q�Vw����rh"	%�Y�Kl~y�vmu��aC�%%d�$�*(pA{;�����ո� &�I�l_P�#�@���!�q�ۘ�����ӈ߯���eeRslK?yd�x��ͤ��\ʦN|6E�2�U�V��,�U�V��V)�����K�J�r)091���\��e���ĄN20�q���9��T�$w��������������g$U.�+ �:������������������밇u
	wJ2�q��a.B.B.B.B.B.B.B.B�C#�p\�R�F@�$$�"�"�"�"�"�"�"��\~� �
�͓���G���"!!!!!!!!��+�7wR��G��F:������������������� ����G��G��{����������VoMN��Wϖ��|sa!�:�R�+�l�ܔ;���w�;�]127�������}�K�ʅ�܀'�;V� 7:5�Ki#�K�;V�����8V����ٽ�H`�W\<��o�ՆMMƋ�W��NF���5qAm#J�)����h�ɯ,T�[翫56����/.�CL�����Yy_Su��c�ݠ?Bn?f�%wh�TI�8�k��s@'�Ga�4���(S�e�I.�z�����;��T�T�\%}đ��ν25"\��D?y���(�^c^      �   �  x��moI�_�?�)������<��/H�k[Ļ>�bmi�6�f�a��9�w��!��6�#��$S-��?������r8��4*aX����ׯ����>)o�Ny���H�}|���Ǐ�ʬ�S9�Ӳ����5��,.n�)�r\���u�UiyR/k��'�I���8+��rYƋ��j���9�{�ľ��6;��C'G̅�C9�N�e�tnEN�S���pU�@i\��ta&�B���s8q����퇗�S�z�TO޶����ꊨ��m�ݭ+��:/B�¹�W/Z�jDu�U��!�s��sމ�;��|,����_�EER�5���Pa�z���u��:,��Kǃl�Ӧ�b����և_k'��7�
K! z �j
KUO�SW���z�ޑ�IQ&2����s{(���d�W<����N |�������Y�ٺ����s����Z��,�8��?�h��SZLYE��)J@P������NUODC�׶sbG۹�6"[ѭn��ZWB8b�὜��(v�7�Ӭ�'I>6��0c@��E!&\Ȼ�8�Kn�V� �H�EZC螽�F��~�t�.-@XV���B/�eb*R,�H*�j�T
EQ֟��)1�� iEZm�ʠӻ<�2��zb�ue	���$�)��"�&$	�I��4��&��ҹ�@�_?��J���W=i�V����U�Y.��SUb�uyj+�j�W~���Ԝa�bGV�U���Зw��y�X�bGV�U��R�r*��H&��,��4 �-{�b�@��RwG��~���6P=iuo�["�-g;�n:���s9�y����T��֡,#�6e���$�8��έ�V`>���(��v*-��|/����
�%e֯>�j��VTU��&�\�>dn*#,�H*�j�T:���En�X�V�9��i �,��m�����W��>��ׅ'5�y�Z���-ya�O�2�M�ʊ�j�TF@�d�L���TEXZ@��f<9���`��T�����<�M��'�#OLu�E��I����Y?��V��K�vNZ;�)��p��Yd�߹��צ�2�Ҫ��R�s+�7�K���xH(\�%�8�2�'#�⧝o�d��(��$��:����S//[�����?N������p������=0��X��Mf,�.-@EFE��s�Ћ�ɭ�ƃ`�f��d����n �뱀�0�@W��J(s./4V�Iͳ��w���6:B��[N�˪���"������[�Q�Q�-�1w�e��8̭�)rj�S�je#S�an%�mi3�KpG��g���.8�@ogl?��b-��m�^2Vl�8S�����v!�I�Z m�`����Z�^�w��No�i��*�j�U	c��"�H�EJ}����pxm�t�`�,?BDwOe�gQ��`Q�,�IC-~��Age �߰�?��>��p*�d�2��è��5z�I�)�cӌZ�צ,<t�g%oNۏ��C�����*��1����U̷+	��7ď��T�SX�N_�ڼӞ��f���Ne2:��0IM�
ui�f���A8+i�8_I��I+����o�z����Cpx[݄7����L��Z��Cb�b�9����/��=�:�I��qTĦ�j��n1�t�����I�Gj �y\&����6$��&u�sθP��Px^���W������[`�(E���}C��-1�?�҂�~��*���f��z.���x�>5$f	ԢA\A=F���g��w�]'k�w�h�R�[�	�q�!���Z+⼧����۞��j��DFӻ)�>p�I�ip�]'��:(xH��8X��kA�G|[�2'٤Jo��	؅��=6����{W��)��ij;A���o����]X�[S��"�N��]�~�1`:�>�NR�f��J����Su�C��N�ۦpw|n�;�w'-�G�d�e*g��5�K1`�-CF��x������ӏF�)�H����PEC�laFPT��R�q:���F��Y�_ �H��T���x�.�^��W���v�oN�B�@������#Yyl{zm�2���Un�m߂e�7ڄ;}�h�P��^89��5?	��S�����0��[���;�m��±�G�E<�oM	�i�4�˚1��H�r����I��s�xю����'PoG��pQ��x�ס�g1���5���<�*?��G����             x��=�n%�u��W̓߮Եw�^�rn0@p�C�;�$9�c؀�؁;�MOɊǒ��������Sݷ���z�U�O�}�Sh!1�������Roe|a�ã(��}����������jz�}5>412��[XR�-��y�������������������v�bh�����_}���������[�l����z�b{���>ڎ�^������/>��N^N/��^,^l���^�ސ��xw{���OO����Nvvo>��{��������$.1���Nt_�1y��O�����cz�� �*P�zK㋋C	��S�|�b��
U�N�����)�~��j����s,��̍,,uh�m�mJ�oSL�����Ϟ��n|����`��b�7�pxp�9<�G��h�l�
���_��������?m��6@�+S�)�F���C,A�EF��3��5�R�Zÿj���E��ʖ�������%����lJ��O�?��Yv�H��ߚ^<��^"�ZD�H���:
�N��8���t���%%՟�D�!��
g�s����z����)���q������ y��NFUD����D���J�iJ�/��Ӏ/�vFW&��OCْ�g��[����!	ӿ���4�o`�H�J��I�F�p����v�)2�3��cV�t����q��Mwboz{<��<?��x�%ֈ���� �(j<(�5��8��5���
Jf���n�p�V�kݜ@���ǖ'�$d�|2��=7���=A��k�i?y���
x�a��n������}�����ɨ��zz����jW��1�W_\Z��NN��cC96��'�����I�F#�=M��������i��a�5H�K"!j"	���Јӟ1;1�0��s�w�}�����Db/֋=6V�+�a�E�&��d������O{;��Q������g�7	B=�[�(��'6���eƫ����X�>C�!A��<L�����R?N�;d��vwu}qfqi$�(&ZS����[������%��]����/�p�ț��e2=��&:�G�m1~� �@��&O���ʶ�,T�ʙP[^C_���g�v��z���e�?%�R�F��&E�L�}�"�a�_��K;���ݽЃ;�).a0���O��e�N����f1\;�K0��K��)���Bj�gK(���+cI3��g�����:ǡ�!*��7w�f����T�H�9���F�e��D�0M@.I�j�#PqEw�7^_�� AYd����g�?�x�!��Pi�
�A1lJ#��k}��O+����׭;���|oo�N���E(�K�Q�C?\Fk(b8Ɲ��q�:�UK+�B��'\v�΋��˭�`���D���im�_O�v�K�B�>�
��MYJ+nj
��n�W4���f�
V��荙W;o�;�Eh��A,��Ͳ�Oր��BR�w0U�o�S�[�Re��9Z��������"�|~r�"���`L�g<�̦}vH���M�!Û���k��K������t��#�<(F�XY2�2	�4��+n�`a�Z̷2��h"��.��kXh�;�����:�;C�'N�H{b���^��%&�I���r�91�'?3��;����=�
� ?Sw�Ń���HL��;�MEny��E�� ��4��
F+�A��8��^nU��Y���+�N��>�Y[\x���Z���p56�wR��(��p=۴��v�Ζ���!�iA�\����a���#����ҙ�ݫ��w�B�ǰ���	�.���#���ف�g��F��A�K�![t�w)f�{�'V�+�n�����m��'��bw>��y��D��ZRϴS�u���a�0�5p�a:��z�A�T��l`(�#��pkX��ew�So��7^�b!f
�����N_�ܗ
�>$DhDc��G��CG�Ԛ�|�O�3*g&�B�w��_��~q���q�&��^vƄfNv�i ��9���Q�p&��pd��:�J�l Q�A;@����ht�-n�д ΃Ma��j��yh��%��7�v���Q��@�d�BB3������5����,n\v�Qhv�"L*t�1����&:���:�)�a��P!RT�/I�E��G�IqX4W�v����ގv_&o�/��v1#d�yQҩ؀@-Aat��EG<]m�w�5�B�g�z1��C�1z���OO��x9�0��++����*��/�ȷ"�e�k��NIP��Z�=O��؛���Ш� ��1t�A~(yTƸ% a;��"�lf �)FdZˈ�]�-%���FG�����J��&y�04�V�R�tL��!�����"-h���%��� \�~�;sO��N�� `��m%�<�vsq�h똬��8��y�L�����}��Lz��T�_���5�V��0���,Z�f�>��Ί-C��}#	��4��Go�r���|���<�q�8�ݶ��|�u-���Ě�a�!�mpI�U%����L;:�d�-/|�t��hb�����	'��AJ)z��l	:ӲN����f=]l2�^�
%���?k��k��z5�71���P�8��$�n6H$( U9k	��z<N�F�?�4#Y�۫���I���4�T@��λ��)���;��F���2}z~�a$NLo��DAi$�^=�`޳�M�J.�6�	��e�7D,%�QG�7�Pp��ǯ��.�yD��zWX��-���%�H�{}����*�1�	hg��R�8H'�pmm�=�7'g^���ʻ^O�Q!Ե�� ��R����>:�/
E�ͼ�/��ˉ����а�:�5���s\�R|"xL�_h�lp[̴ѱ8/���m�U!I1)I�=V$Q�Er[_� �jc��&W.�C�M��֪k�$��o����U���H&a�Y>�I�/IhK &�%�~��a�=�|d�#��:�F�7�V~�7���L����L4|����Ct�M�L.Ј�:��j���uVM�&g=���*6)�e�es��ӔV��L�t����"���cd-�I;^�x2�vN�CsXԉ�U?������t3�7�Ч�f'������F9��`V��DL9��Ŝ������zC����d��ti��T�|%C����KFDY8��� 	�l����ǂK^ Vbn��nCIE\V[�ٟ=�Y�Y����P}|�E=Ѣj	Nx�]�E^
�[)��U����Sd���)}���XQ��t�����K�K\�����<���~רj��,�E��s��[oGwwFg�΃�'5�����#[a�����-A� ����.�8*I�w*6e��My�H����t�p���n	0Q�� X��Wy�����dj2��I�s�kG�#����:@��b?��%���u����I��ðT9�5%ɕ0��zq`uR����߼�mɠyv�$��LP7š�57�J ΜQ')�'92M�v���<�02�|��ao��SMvC�^��U���2����	!�v�O��V?Q�&��_�&��x��QQ's�P[jt�,�a6��&�z[J�n�hF겐�Fe��a�֚��.�u��Q�I�K��CF���eZ���^q�_ �b^�%�Z�
B���a!��n������h�t�<��#�J��	���J�F��6¤���TMF���.W���]V��w�MY�M�K�[����M0�vvXPT�;ա�ի�k��{"���!�1P���e�A���MK�<bR���+��U$?�'B��)����7*��O�#u�b�K�[�>	p0m����+��ff���D����VM^�FQ�K�-�����_����D��v������H$I(�;��v�B5�A��hj������d0o��1�?y�@���,�d	�&��v�2G ����#�a�$���0R�BTHƥ	��}�ZXSz�$���eoND���	�'\0��
x)���� bC����U��4T�z��5�8xE���CT����M�{��fǘ����N��q---g}W�󸶟{���v�B@�YS��8�YX{���f���V���U�R�g%0�n��L���    � �A(�8���?I+���{�q�MLL�V��I�b�^�9Ha�$A*���G�D��.w�]�_��`��n�]�̶m��o=϶�k{%�<-�Gz��ఎ���tr��$x���IfF6ǎƷC��<݀)6t�=��%�@�6 �(�aJ���������`��h���=x|��9�����%�K�����A��"f-�u�0����I�^l���Od�5ê]ʄ ��-�1K�[p���~>629�Ɲ0YuL�>�h^�l�Y���T�9Y}cW��tU95L����*)D�K�@^�G�B������,/ {P����>6�16V����>w{0} ��B�B��T_���덖���4�W[��̻f���#�U������9�B{'
��_�z��-?ëR�]��~���;l�����mT�l�Yz��l��NxI���WIt����F��F���hku~�D�)Ĺ���ӱ��IO��@�֔6Q��b�ZX2���*I�D�\���:]��l�o.��,�LR�<��n�����Ah3h�5Z^��kzy�7M���, �s�J�	��⶜	���u`A�v����HӝZ&��^ѧɄ��`�`�^�2���JM�`d0�#q�#s�
/�Y7Xh�3��.E;>����D�;�S��ԙ��eT�VS�#�d�;jueV+���UJ)����\�_��Zů�㋱b:�[j�"��ikZ��eCT�`YN!��}d����+A�j>�^���ke;�E���3h����n�I��Jy������������&|�v���"�ia���註g������qZ@2���Otjsz��l-�\��D���K���F5<�@�@�-6�Obe���|*5��щg8]���8�&�P*/ӗɩ���&-.b,]
�$h���
n�+S����Z�{�8��ʧM�걉���Y���i�$l��z�~��>8�B��ؔ�X�DQ���^��m��"A�Y�O�Q���4
J���ō�󥱋���y�.��H@[�Tp> (m(-�y@%&����[��?�+�M"����~ĺ�Xٻ]Xy�����K�bWb�}φ*w���	�(<�L{.��'v�k�ʉ�`�oҟ&T��~8��z+�3�s�+%Y���8J�M��:L����Il�
I
�%B>LPd�u�[_�˰�����M��w~ܥ�f7�:����}Sa�z.|��'���(b�q՘ 
�KK�A3~	b.�Y#�S�׷'��w�~Ϋ��g5O�����/S�cy1�Se�����OK�
���
FT�z[O�%jx&I)m�=�x�x�Ⱥ�n֧~�c3FƎ w\��������7�<j���q��k*�u�`�?��6��3�]�#���k�,��`%��}�˨�!�����x�аf}Z(��;H�j�D[k���$Ek(9�C#sē��9'O�`
���7x��bD��T}���խ����Uݤ�ە���ɒV�j4�	B��5�dD�]�'�� �X�摄$�^��6#I�^I;�s��AH�?ҙ@7��+�é�����FtE	� <B�DЉҔ&)\N{=���t�)-��,iJ�gj��[؋����e˩U�%�Z�A�d����cJX��d{3YZ݌�O`CJ�,��9��w	0���{���!�Q��wS��L�҈��r#D �#�'��!���*��}�I�}������6��9�w<��`<(�~ӹ����o�545?�����_����E�J��Q�Yrp�=���b��w-��j�I1kM���T����0?@���86���!�RZv�Ǭ̗��-5��]4(ʐۄk(l`����{d�der�����,��Fa1(ҙ (���y�%p���fg��P���u��7�K�.*U�wb�8*��u�Xa�'S���%�W7'��E$�>\��a�h���h	<�ψY�M:&%©n[K�/7&r�(~n9�H|������Q�Z�t�"�+�l�V^��ؖ�������c�NĬإ�$%�*$�2h�l,�O\̮͆V��'�������+��1_;�I�S�l�����vm���r#�
F�ե:��j+z�dl����dl��	�O֣7~�r=���{���]N�Ip/9K���z�l	2�u�Wշ�_
ѐ����W>	#w&VCyw�[�z�?�]N6V�w�M���#h�l�}`^��ҽ�F�����+��f,\>���Nb)���15ɻТHb�4]��-�tSʹ$r��5��\����R_��K3�vF�xɐ'��j��ќ�*��]M@'�
 �_�%�����q�O���|n~n�v�|�,4(��P!�<�b*=���t�}�ht�O^�`���^J���Պ���s��B򷅶��T�0�?Y켞��{7s�jNT�����0��-��BXSŕ���L˸�$�BV_!��ޅ#������u:�~���< E#�8��aX�P�D��3X�9�hW;\��L�>�֐��ihD!��X��m�9���\��Y��}�.���W���P��Z�,l�*�b��μ���%0��H@[\H�5H�N�9�����A�!q��I��!G1D -���1�|�	�E������6#���0�&�p�#�+�Ǉ7%���@4ЁvA��;�PL������=��op�DOf;���DT^��ǪX";!s�ȫ�;svtv{Q��M��([�z{�utH��n.���7�#��LY8w�s=W�>D�[n_��tV܈��!�ֺ�`�����6)4x�$V��b=��v:tt���"/�CT"�yD�b��+� ��:kK�>�V�~�t;U�d�B_��e+�;[z��-�~ٰI�b�
�.��t�t��]8�?,5u���ז�F_n�d��Q;(ג�
QCE��AGp;�i!���������Ԩ��p'�Fs(A��&�cQ�r]�n�j�w�_nP��q8.^�Q��\_�lu�7�f�/��)��B�8 �W���)�v���*�ĺA�[Vl"t:qЕYJ��y�{�3qv�br����v�lVS�a�s�XA�M��'1Ѻ.�L�  ���M
Y�t�Q��䚏��O_�S�W�����政N0�Xo^�9Uk�6�W6v8��-{#��y��T��kOz���-ȴ�'`�^n��ڰą��"�>���E��7(U��
w����=��q<N�`�zz��h����d�t�J�:�$L���`[�LH�6�^���Pr{�2)z� Hmh1�-}�Ψ*�=��a�h|v����[�'gTC'l�Y=z�l�N�kc	�Q��%l����б��0I��
��H���n�AS(K�M/���M5Lyd�Ԡ՟�������	�Y�ڻ��������)'�|Z��&1� ��+S~���n���Q����pa�0��`1&sa�/	H�⑨�Ί�������$M�)�j��'�v��sB�\�������u���O�[c���}�{�D���[��
��1���oI�2F���<v�$��jh0c@�)� @��R��*��Tִ]E� %M�Pe đuC���٤t��K�81Sr9���+m��OE�e�D5N�ܮ"?^|ؤv���/p�v����I��h���M[��SF���'w�x@~�!i��{R裠IryF4,Ŕ}<Ѭ��:�k�İ�;�H�N�;o4!
q�՞X4@zBmvfGDIm�&&ڀ��	���ɝ&��,K��O	�0"UrO\#�I���2�zSI2P!T�q���6r�yY�yc�NA{#�q���,2����ޯgq=��I��
��tb�Lp\��aK�O�֠+�.��Zj���<�ʢL��Z�&�!�b��;��$ Iv�ByO�fKQ$��x����6�i�\�5)x\0Oa��pwJ��{o�!�(�=��D)�A�40D���c��n1�4�ٷC��K^�r��S7È�jC&m����Q����'ʷsoB馿����
kU� Êc�������0�������[1,��Z;,��j�a�Wqq�	��;�^��z��y��a�q����* /  ��rm��T6P�\���pX�!�(jF� �f`u�)�����}@'	#�ʱ�l�|�"?��Xxm�e��1B\�3,�8:�H3B�y9�NRf����0|[��g{l1�&�)?$,7�d���X�/HhҐvcF�R����A�I�FP���u}�H���}:�L�f�=f�b~�v�	1�&a�;��*j���yƇ2+��R^7C@~�wr/�F�_F?T73�Q��T�iU�p�J�0c����R�P�1�"���/I=3��>+�hU6�1�]|"�Yj�1mA��͢�$c�����MC�8��I���˘p5%t7|��b�YS��8�D-OW�������G\�A���y�U��1ĈI�����|�tq�g�r� [	�ڱp[�:Lf�a*�TJfW1�5@�4�f	���
�@�ب�2��E�h�U��3fDJ�X�w*C����=#�5e9?Q���t���u@�����*��`ޕe�����U�ங��4ToB@Yr_�*�"��3�TN#y̰�K�8r]����[��������.��         V   x�M�+� DQ=�
|���ϓ� �A�6uTu�E>yr'#h����+7���Ǩf2����v��J��h
�V,����Q�I���!�         }   x�-ͻ1C��2s�lcO/��/�詨=ʇ`j�f�:��Jl����q��?t�-�X�����M��M�N[��Oҷ�/+A��$�K �ή����h��^om�_-�����0�         j   x�u��	�@C��*�@�-&�Z������m!� ��6<a3`Z���:��Sy�:,�٢wg�Xkh�� �F�K�+��;.�|z!�{����r���r&�      	   �   x�u���0�PE0Á�,jI�u�|2�=|��4	A���a��>�Ul�g�Ez�F$�`v:����O,ٱ;΃���HE�%j��}h�[L�q�4��f���q^{,WiyM$��\�����慕n	���	�*�ol T��i8W,u�+��]�8W	�j�6�QG��>8���?e�o�         x   x�u��1Dѳ��1òFԒ2ҿb�U��O#�����ڻ��8��X�Ӝq��_��#*�H�䩋/��|vC1ʡ~�rm�?�{V���:u�����x�,�l*�O]^*"�.8�         |   x�3�O�KI-J-�0�¾/l����+�{tL
�3�J����b�(b
�`ACS$ANC� Ww��� �O?�μҜ�	##S]#]#CC+c#+cc=KcC\�\1z\\\ �=m         ?   x�3��H-�O-v.-0LIM��2�
( E���8
F\&�\c.SNgc� .3�Ċ���� 4m         _   x�m��	�0DѳUE��j�*"���O|M0�\><n�x���$]�b.�2�9���hG+�V>12�݋Y��V�>`�bG��ӵ��3a! ��l!/         >   x�uʱ�0��L���!$�Y��nҺՉ��p��`g4`���P��jV�c,^�w��MD���         �  x��[�n#�}���1���4k_�4$EQ�DQ�.�F��E���"�
���`��8�91���L0�a�Z��/�-R)��A {rԤ�ͪ[u�:�V�����q�Vp�v�Q�!A)�i��@\�F��k~� �70zc�-�76�V3�k��A�:��^j�e�3�����]?�[Q'�Zn�_*��L*�4�`�����	??�Ńz��<X2�����փf�-�n���e�c�n8f�*)I�f�+Bq�H$ӸHT�KDJ��vJm��uu�8�
[o�"{���݇�Tr(�.x��.���`<��t�û�\��K��f�'ܝ��l�?G���������������U��Ժ�}�8���-<��{�_[٭Tp�&@Lh�8��P�-��DΑ�
�Z��ӑ�.E���M�"D4���.";��^қ��;��-��'\_zߝ?��[�,5��5O=�y�x�AA/�{/�۠��H���{���{��:� >�5O��y���:����}�w��ˇ��g��߽�X�?�ͼ��n7��7p�\ ɂ��ϟ�?;�z\8���KfR��1��#��G��X�B��Åv��
���BN��<>���B�O��V�2��4V�Hg�Bi�;���l��� ��������,f\��~(�Ιϭf=��W0�g��/1��ꋧC����X�r��)��Vbw�*� k�"T����;�?*�S���ϖ3�Mo��O(��2d<��~޿��/F���j�.�ڜ�����3�I^�o%�9�1�
a���k��ۅA�(�s��b\��l�{_�y�����̓O�?��>s��(��aJƨ��2	��xh�>��I��
H��:F��AFƮx�������Q�޾���}���s�"�"���4�����������5�rfy�3��J��W�\�R�oTʩ0�l����p$$Nc�s�l��o�E�Q4.M�M%��tu�r+ �r+ �r+ �r+ �r�9��⴯W+7j��f
s
1�S	�G})����+4]_�ѨT�c�1	 Bh"6��t���n���ù"ѕ���w�Q�8<������rx��Z33����NO��)q��.a <�9ZژM�	e���6��
ՎU!a�4*�Ȳ�y�1�T������Y�|)��ջ�M<��KX�[��uOČ�����)T�b��a���/�ckrl�f���"�i$ |)HV��	��3$�ƚ8pi�< N7ѣ�vw�p���� ��E���N�|�郝0�7�.�s�M(�Q+��PdI�� ��m�����X���R(�Hc d@�&Vy�1�f��И�Gj���VX�a46�����L���ɝ_�-���ھ4Ɗb%$װ��QX��i�
4���kl�F��ǉ��Ƣ��$y�G�X�~�˸��3���A5�N�.��ܕM|rr/6.���wjn�?Oڱ���!3z�RP�!qK��>�o�
�Bb}a�g�˩k"��!pkD)�JN��c�C��k�aT�N��g+�l��6K�x=��gjCZ��zd�Ǻ��\mJ,�-�M�� '�C���U,m}���P����x�g30Z r �T�?q�٤@֐�-�R��N4�5ۡX�Um褃�hiQ��c��}ZQ��G��2:p�N��ɶ�G�Nԯ�G�0lS���w��m��0�M1�7%��I%0!�i=Τ۽�Ҩ`�S[I4�M9�(�lwC暥Vխ�Oc�`+E�z���o�u����N�\��ʭ'�x�����h��%mx/�QX�!���4�2�	"�qg$�+�)|O�Lv=#L��kd<��J�PX��1ߞK�U�B����j8*�{�\�9�tۉ�r%Qn���<�#�Buʶ��`/W�W�;�>XܖtUHzI���U1�/&ݳ��*��J�s_U�VU��o.[U!�Ee%�#@7���݉1��z�a�RD����M�J��[2LɈ�(�-�/��dv'�<9<����P��[�&��TR�`+B����c��X�ϝ
O����_V2 �"���%���ka����L!H<��E�+dS[,W�tN�$���;���K�s��c�6� ��J�^���P��i�[hc���{��t�P3q�L\A��]�����LRjNS�F�P@��Wyӑ��d%f��v��O4�z>�/�7u=�ϥP,��˵f'n﹩��k�����;@,��61�\�n;���b\,�l�S{�R��@�ZXf4��`"�*�� W.l�����+�A���3�
�ל���@�$Y늬��ꊬ��ꊬ�hȪ����*"�f�1[�5|���՘����tަ.�R
��G����>��N�f��v����s�]:qs��A�n4��a�89HEv˸�2���ԙ�%�6�h��I[��.�+�㭗ԏ0������r!��� |��#�;���5��<1>���|d)Bȥ���������� �%j�[��ĝn�)�fI҂iF$)�8�^�wR��B
��,'�R�����I�B\ѮOSO*�����zv/�J�2$�iw�ɳHUBѾ㶳����~Y�J��F��0����{��Ƃ�J-k3 ��9�@糍9q��5m��R����6��rߓ^��K��!�(f� �����@�<��4 �Kl~!\cX�/w�7w�#���N$������l����i��$��2�<��<���|�ݘ��=�ɜ}R��z�b�H�l��.��;��D��K�
ִ�SR��R"�0�����.���$��J �wPHZ�3�R)���)P�B��ܘ�d��8�S�'�C=�C��'xb]l$�ōJ�-f�v��Q����Z�V$�,Y��h��)�h�,Wk���cZ����}OX3����$��9Nsq�a�JHS��*-}{��J��B^��h��|�*�y�	�ȧ�C����l��=j7�
���)_p=�5�EC� �����sbT�����י����3Wˁ�v<���KT^��0n��&�<��/���D�K!��lKnk���Rc�MR�t�i�+5�ms�n��e��)6�x��٨�+��{	`ؔ|��,�)�
�P��dCfZ��,�� ���^�M�s�eY	:��YҰq�[ґ�W���N爐*��&��ю�l�lu�cU,[�VŲU���T,��s.~h�b�Qw����""0�JJ��(겟��n�LI3��x�T|�m{mm��8��     