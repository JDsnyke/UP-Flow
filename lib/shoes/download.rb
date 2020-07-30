# Borrowed/backported from Shoes 4 which I modified to fix some bugs 
# and conform better to the Shoes 3.2 manual. I hope. 
# https://github.com/shoes/shoes4/commit/b0e7cfafe9705f223bcbbd1031acfac02e9f79c6
require 'shoes/open-uri-patch'
require 'shoes/HttpResponse'
require 'openssl'
class Shoes
  class Download
    attr_reader :progress, :response, :content_length, :gui, :transferred 
    # length and percent is preserved for Shoes3 compatibility
    attr_reader :length , :percent
    # thread is used by packager to sync download ?
    #attr_reader :thread
    UPDATE_STEPS = 100
    
    def initialize(url, opts = {}, &blk)
      @opts = opts
      @blk = blk
      @response = HttpResponse.new
      @finished = false
      @transferred = 0
      @length = 0
      start_download url
    end

    
    def start_download(url)
      #puts "download method: starting for #{url}"
      @thread = Thread.new do
        uri_opts = {}
        uri_opts[:content_length_proc] = content_length_proc
        uri_opts[:progress_proc] = progress_proc if @opts[:progress]
        uri_opts[:redirect_to_https] = true
        #uri_opts[:ssl_verify_mode] = OpenSSL::SSL::VERIFY_NONE
        uri_opts[:ssl_verify_mode] = OpenSSL::SSL::VERIFY_PEER
        if RUBY_PLATFORM =~ /mingw|darwin/
          uri_opts[:ssl_ca_cert]  = File.join(DIR, "lib/shoes/cacert.pem")
        end
        open url, uri_opts do |f|
          # everything has been downloaded at this point. f is a tempfile
          finish_download f
        end
      end
      #puts "Thread finished?"
    end
      
    def content_length_proc
      lambda do |content_length|
        download_started(content_length)
        #eval_block(@opts[:progress], self) if @opts[:progress]
      end
    end

    def progress_proc
      lambda do |size|
        # size is number of bytes xferred, so far.
        if size > 0
#        if (size - self.transferred) > (content_length / UPDATE_STEPS) #&& !@gui.busy?
          #@gui.busy = true
          @percent = size.to_f / @length.to_f
          eval_block(@opts[:progress], self)
          sleep @opts[:pause] if @opts[:pause]
          @transferred = size
        end
      end
    end

    def finish_download(f)
      #puts "download method finishing"
      @finished = true
      @response.body = f.read
      @response.status = f.status[0]
      @response.headers = f.meta
      #puts "Calling finishers #{f.size}"
      # The download thread needs to quit.
      #@thread.exit if @opts[:save]
      # call :progress with 100%, just in case
      @percent = 1.0
      eval_block(@opts[:progress], self) if @opts[:progress]
      save_to_file(@opts[:save]) if @opts[:save]
      # :finish and block are mutully exclusive (see manual)
      if @opts[:finish]
        eval_block(@opts[:finish], self) 
      elsif @blk
        #puts "calling download blk"
        eval_block(@blk, self)
      end
      #@thread.join # to make synchronous
    end

    def eval_block(blk, result)
      blk.call result
      # @gui.eval_block(blk, result)
    end

    def save_to_file(str)
      #puts "Saving to #{str}"
      @outf = open(str, 'wb')  
      @outf.print(@response.body)
      @outf.close
    end

    def download_started(content_length)
      @length = content_length
      @content_length = content_length
      @percent = 0.0
      @started = true
      eval_block(@opts[:start], self) if @opts[:start]
      #puts "download started #{@length} bytes"
    end

  end
end

# Monkey patch over the 'C' code. 
class Shoes::Types::App
  # Shoes::Types::App seems wrong but it works. 
  def download (url, options = {}, &blk)
    #puts "download #{url} #{options} "
    Shoes::Download.new(url, options, &blk)
  end
end

