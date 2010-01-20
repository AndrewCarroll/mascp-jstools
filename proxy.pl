#!/usr/bin/perl

use CGI;
require HTTP::Request;
require HTTP::Headers;
require LWP::UserAgent;
require HTML::Tidy;
require Digest::MD5;
use File::Spec;


my $method = $ENV{REQUEST_METHOD};

my $data;
if ($method == 'POST') {
	$tmpStr;
	read( STDIN, $tmpStr, $ENV{ "CONTENT_LENGTH" } );
	$data = $tmpStr;
} else {
	$data = $ENV{'QUERY_STRING'};
}

my $cgi = new CGI($data);

my $URLS = {
  'phosphat' => 'http://phosphat.mpimp-golm.mpg.de/PhosPhAtHost30/productive/views/Prediction.php',
  'suba'     => 'http://www.plantenergy.uwa.edu.au/suba2/handler.php',
  'promex'   => 'http://www.promexdb.org/cgi-bin/peplib.pl',
  'atproteome' => 'http://fgcz-atproteome.unizh.ch/index.php',
  'atproteome-json' => 'http://fgcz-atproteome.unizh.ch/mascpv2.php',
  'tair'    => 'http://www.arabidopsis.org/servlets/TairObject',
};

my $tidy = {
    'promex' => true,
    'atproteome' => true,
    'tair' => true,
};

my $service = $cgi->param('service');

my $url = $URLS->{$cgi->param('service')};

my $hash = Digest::MD5->new();

$hash->add($service);
$hash->add($data);

my $tmpdir = File::Spec->tmpdir();
my $cached = File::Spec->catfile($tmpdir,"masc-".$hash->hexdigest);

if ( -e $cached )
{
    if ($tidy->{$service}) {
        print CGI->header(-Content_type => 'application/xml',-Access_Control_Allow_Origin => 'http://localhost', -Access_Control_Allow_Methods => '*', -Access_Control_Max_Age => '1728000', -Access_Control_Allow_Headers => 'x-requested-with');        
    } else {
        print CGI->header(-Access_Control_Allow_Origin => 'http://localhost', -Access_Control_Allow_Methods => '*', -Access_Control_Max_Age => '1728000', -Access_Control_Allow_Headers => 'x-requested-with');        
    }
    undef $/;
    open $infile, "<".$cached;
    my $buf = <$infile>;
    print $buf;
    close $infile;
    exit;
}


my $request;

$request = HTTP::Request->new('POST', $url,new HTTP::Headers( Content_Type => 'application/x-www-form-urlencoded' ),$data);

if ($tidy->{$service}) {
    print CGI->header(-Content_type => 'application/xml',-Access_Control_Allow_Origin => 'http://localhost', -Access_Control_Allow_Methods => '*', -Access_Control_Max_Age => '1728000', -Access_Control_Allow_Headers => 'x-requested-with');
    my $tidy = HTML::Tidy->new( { output_xml => 1, add_xml_decl => 1 });
    my $start_content = LWP::UserAgent->new->request($request)->content;
    my $repl_doctype = qq|<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">|;
    $start_content =~ s/<\!DOCTYPE[^>]+>/TEMP_DTYPE/mi;
    $start_content =~ s/<\!DOCTYPE[^>]+>//mi;
    $start_content =~ s/TEMP_DTYPE/$repl_doctype/mi;
    $start_content =~ s/&nbsp;//mgi;
    my $cleaned = $tidy->clean( $start_content );
    print $cleaned;
    open $outfile, ">".$cached;
    print $outfile $cleaned;
    close $outfile;
} else {
    print CGI->header(-Access_Control_Allow_Origin => 'http://localhost', -Access_Control_Allow_Methods => '*', -Access_Control_Max_Age => '1728000', -Access_Control_Allow_Headers => 'x-requested-with');
    print STDERR $data;
    my $content = LWP::UserAgent->new->request($request)->content;    
    print $content;
    open $outfile, ">".$cached;
    print $outfile $content;
    close $outfile;

}