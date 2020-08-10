#!/usr/bin/env ruby

Shoes.setup do
	gem 'fetcher', '~> 0.4.5'
end

class UPFlow < Shoes
	url "/", :initialscreen
	url "/terms", :termscreen
	url "/getkey", :getkeyscreen
	url "/savekey", :savekeyscreen
	url "/initfinal", :initfinalscreen
	url "/main", :mainscreen

	def initialscreen

		require 'assets/init'

		if @@init == "true"

			background "#262330"

			font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

			stack :margin_top => "20", :margin_left => "550" do
				image "assets/images/main-logo.png"
			end

			stack :margin_top => "20", :margin_left => "20" do
				title "UP Flow", align: "center", stroke: "#F97C68"
				subtitle "An unofficial UP Bank (Australia) utility for Windows", align: "center", stroke: "#FFEF6B"
			end

			stack :margin_top => "60", :margin_left => "20" do
				para "Follow the on screen prompts to get started!", size: "18", align: "center", stroke: "#F5F3F9"
			end

			stack :margin_top => "60", :margin_left => "370" do
				button "Begin", width: 680, height: 68 do visit "/terms" end
			end

			stack :margin_top => "20", :margin_left => "370" do
				accountref = "https://hook.up.me/jdsnyke"
				button "Don't have a bank account? Consider joining!", width: 680, height: 40 do 
					if RbConfig::CONFIG['host_os'] =~ /mswin|mingw|cygwin/
						system "start #{accountref}"
						info "Launched link to obtain Personal Access Token!"
					elsif RbConfig::CONFIG['host_os'] =~ /darwin/
						system "open #{accountref}"
						info "Launched link to obtain Personal Access Token!"
					elsif RbConfig::CONFIG['host_os'] =~ /linux|bsd/
						system "xdg-open #{accountref}"
						info "Launched link to obtain Personal Access Token!"
					end 
				end
			end

		else
			visit "/main"
		end

	end

	def termscreen

		background "#262330"

		font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

		stack :margin_top => "20", :margin_left => "550" do
			image "assets/images/main-logo.png"
		end

		stack :margin_top => "20", :margin_left => "20" do
			title "Disclaimer", align: "center", stroke: "#F97C68"
		end

		stack :margin_top => "30", :margin_left => "20" do
			para "JDsnyke does not own nor work with UP Bank\n\nAll names, logos and content belong to their respective owners\n\nYour personal access token will be stored offline and will be used to access you transaction history\n\nAny issues or damages that may arise due to this alpha application are at the discretion of the user", size: "18", align: "center", stroke: "#F5F3F9"
		end

		stack :margin_top => "60", :margin_left => "370" do
			button "Agree and Continue", width: 680, height: 68 do visit "/getkey" end
		end

	end

	def getkeyscreen

		background "#262330"

		font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

		stack :margin_top => "20", :margin_left => "550" do
			image "assets/images/main-logo.png"
		end

		stack :margin_top => "20", :margin_left => "20" do
			title "Get your Personal Access Token", align: "center", stroke: "#F97C68"
		end

		flow :margin_top => "30", :margin_left => "330" do
			patlink = "https://api.up.com.au/getting_started"
			para "Visit ", size: "18", stroke: "#F5F3F9"
			button "#{patlink}" do
				if RbConfig::CONFIG['host_os'] =~ /mswin|mingw|cygwin/
					system "start #{patlink}"
					info "Launched link to obtain Personal Access Token!"
				elsif RbConfig::CONFIG['host_os'] =~ /darwin/
					system "open #{patlink}"
					info "Launched link to obtain Personal Access Token!"
				elsif RbConfig::CONFIG['host_os'] =~ /linux|bsd/
					system "xdg-open #{patlink}"
					info "Launched link to obtain Personal Access Token!"
				end
			end
			para " and follow the provided instructions", size: "18", stroke: "#F5F3F9"
		end

		stack :margin_top => "20", :margin_left => "20" do
			para "After you have your Personal Access Token ready, continue to the next step", size: "18", align: "center", stroke: "#F5F3F9"
		end

		stack :margin_top => "60", :margin_left => "370" do
			button "Proceed", width: 680, height: 68 do visit "/savekey" end
		end

	end

	def savekeyscreen

		background "#262330"

		font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

		stack :margin_top => "20", :margin_left => "550" do
			image "assets/images/main-logo.png"
		end

		stack :margin_top => "20", :margin_left => "20" do
			title "Enter and Save your Personal Access Token", align: "center", stroke: "#F97C68"
		end

		stack :margin_top => "30", :margin_left => "20" do
			para "Enter or paste your Personal Access Token in the text box below and continue", size: "18", align: "center", stroke: "#F5F3F9"
		end

		stack :margin_top => "20", :margin_left => "300" do
			@init_api = edit_line "", :width => 820, tooltip: "It should be something like up:yeah:1234567890"
		end

		stack :margin_top => "60", :margin_left => "370" do
			button "Save and Proceed", width: 680, height: 68 do
				if @init_api.text() == ""
					alert "The text box is empty! Please fill it in before proceeding!", title: "Enter and Save your Personal Access Token"
				else
					if @init_api.text.include? "up:yeah:"
						Thread.new do
							require 'fileutils'
							FileUtils.cp("assets/keys/crypt.gkey", "assets/temp/crypt.rb")
							require "assets/temp/crypt"
							@@crypt_final = Crypt.class_variable_get(:@@cypher_bak)
							File.open("assets/temp/crypt.rb", "w") {|clear_temp_crypt| clear_temp_crypt.truncate(0)}
							@init_api_save = @init_api.text
							i = @init_api_save
							extract = 0
							newstring = ""
							while extract < i.length
								a = i[extract].ord
								b = @@crypt_final[a].to_s
								newstring = newstring + b
								extract = extract + 1
							end
							if @init_api.text.include? ""
								@init_api_save = newstring
							end
							final_shuffle =  newstring.to_i * @@crypt_final[129].to_i
							final_encrypt = final_shuffle.to_s.reverse
							File.open("assets/keys/api.txt", "w+") do |init_encrypt|
								init_encrypt.write "#{final_encrypt}"
							end
							File.open("assets/init.rb", "w+") do |init_file_false|
								init_file_false.write "@@init = 'false'"
							end
							visit "/initfinal"
						end
					else
						alert "There seems to be something wrong with the entered token.\n\nPlease double check!", title: "Enter and Save your Personal Access Token"
					end
				end
			end
		end

	end

	def initfinalscreen
		background "#262330"

		font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

		stack :margin_top => "20", :margin_left => "550" do
			image "assets/images/main-logo.png"
		end

		stack :margin_top => "20", :margin_left => "20" do
			title "Get Wise with your Money", align: "center", stroke: "#F97C68"
		end

		stack :margin_top => "30", :margin_left => "20" do
			para "Congrats, UP Flow has been setup successfully!", size: "18", align: "center", stroke: "#F5F3F9"
		end

		stack :margin_top => "20", :margin_left => "660" do
			image "assets/images/completed.png"
		end

		stack :margin_top => "60", :margin_left => "370" do
			button "Get Started", width: 680, height: 68 do visit "/main" end
		end

	end
		
	def mainscreen
	
		# App Menu
	
		mb = menubar
		helpmenu = menu "Help"
		@apiitem = menuitem "Set API Key" do
			window :title => "UP Flow - Set API Key", height: 140 do

				font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

				stack margin_top: 20, margin_left: 13 do
					@enter_api_key = edit_line "", :width => 570
					@enter_api_key.text = @@decrypt_api_key_final
				end

				stack margin_top: 5, margin_bottom: 5, margin_left: 12 do 
					@p_info = para ""
				end

				stack margin_left: 13 do
					flow do
						button "Save", stroke: purple, tooltip: "Save API Key" do
							Thread.new do
								@p_info.text = "Saving key, please wait..."
								@p_info.stroke = blue
								@api_key = @enter_api_key.text
								i = @api_key
								extract = 0
								newstring = ""
								while extract < i.length
									a = i[extract].ord
									b = @@crypt_final[a].to_s
									newstring = newstring + b
									extract = extract + 1
								end
								if @enter_api_key.text.include? ""
									@api_key = newstring
								end
								@p_info.text = "Using secret key and scrambling content, please wait..."
								final_shuffle =  newstring.to_i * @@crypt_final[129].to_i
								final_encrypt = final_shuffle.to_s.reverse
								File.open("assets/keys/api.txt", "w+") do |encrypt|
									encrypt.write "#{final_encrypt}"
								end
								if @enter_api_key.text() == "0"
									@p_info.text = "Error!"
									@p_info.stroke = red
									error "UP Flow - Set API Key : #{@p_info}"
								else 
									@p_info.text = "Successfully completed!!!"
									@p_info.stroke = green
									info "Encrypted and Saved API Key successfully!"
								end
							end
						end

						para "  "
						button "Copy", tooltip: "Copy content in text-box to clipboard" do 
							self.clipboard = "#{@enter_api_key.text}"
							@p_info.text = "Current content copied to clipboard!"
							@p_info.stroke = blue
						end
						para "  "
						button "Paste", tooltip: "Paste content in clipboard to text-box" do
							@enter_api_key.text = clipboard()
							@p_info.text = "Current clipboard content has been pasted!"
							@p_info.stroke = blue
						end
						para "  "
						button "Clear", tooltip: "Clear saved user API" do
							@enter_api_key.text = "0"
							File.open("assets/keys/api.txt", "w+") {|clear_api| clear_api.truncate(0)}
							File.open("assets/data/accounts.json", "w+") {|clear_accounts| clear_accounts.truncate(0)}
							File.open("assets/data/transactions.json", "w+") {|clear_transc| clear_transc.truncate(0)}
							File.open("assets/init.rb", "w+") do |init_file_false|
								init_file_false.write "@@init = 'true'"
							end
							if confirm "Done!\n\nUP Flow will now close.\n\nProceed?\n\n", title: "Task Completed"
								Shoes.quit()
							end
						end
					end
				end

			end
		end
		helpmenu << @apiitem
		@licenseitem =  menuitem "View License" do
			alert "Copyright (c) 2020 JDsnyke\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.", title: "MIT License"
		end
		helpmenu << @licenseitem
		updateseperator = menuitem "---"
		helpmenu << updateseperator
		@updateitem =  menuitem "Check for Updates", key: "control_u" do
			require 'fetcher'
			Fetcher.copy("https://raw.githubusercontent.com/JDsnyke/UP-Flow/master/assets/version/latest.ver", "assets/version/latest.ver")
			info "Fetched latest.ver from Github!"

			require 'fileutils'
			if FileUtils.cmp("assets/version/latest.ver", "assets/version/current.ver") == true
				alert "Congrats! You are running the latest version of UP Flow.", title: "Check for Updates"
			else
				if confirm "This app is outdated! \n\nVisit the repo for the latest version?\n\n", title: "Check for Updates"
					updatelink = "https://www.github.com/JDsnyke/UP-Flow/releases/latest"
					if RbConfig::CONFIG['host_os'] =~ /mswin|mingw|cygwin/
						system "start #{updatelink}"
						info "Launched lastest release link in browser!"
					elsif RbConfig::CONFIG['host_os'] =~ /darwin/
						system "open #{updatelink}"
						info "Launched lastest release link in browser!"
					elsif RbConfig::CONFIG['host_os'] =~ /linux|bsd/
						system "xdg-open #{updatelink}"
						info "Launched lastest release link in browser!"
					end 
				end
			end
		end
		helpmenu << @updateitem
		@repoitem = menuitem "Visit Repo" do
			repolink = "https://www.github.com/JDsnyke/UP-Flow"
			if RbConfig::CONFIG['host_os'] =~ /mswin|mingw|cygwin/
				system "start #{repolink}"
				info "Launched repo link in browser!"
			elsif RbConfig::CONFIG['host_os'] =~ /darwin/
				system "open #{repolink}"
				info "Launched repo link in browser!"
			elsif RbConfig::CONFIG['host_os'] =~ /linux|bsd/
				system "xdg-open #{repolink}"
				info "Launched repo link in browser!"
			end
		end
		helpmenu << @repoitem
		aboutseperator = menuitem "---"
		helpmenu << aboutseperator
		@aboutitem =  menuitem "About", key: "control_i" do
			current_ver = File.read("assets/version/current.ver")
			alert "Version : #{current_ver}\n\nRuby Version : #{RUBY_VERSION}\n\nShoes Version : #{Shoes::VERSION_NUMBER} - r#{Shoes::VERSION_REVISION}\n\nAuthors : JDsnyke", title: "About"
		end
		helpmenu << @aboutitem
		mb << helpmenu
		
		require 'assets/engine'
		require 'digest'
		require 'json'

		# Body
		background "#262330"

		font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

		account_json_file = IO.read("assets/data/accounts.json")
		my_accounts = JSON.parse(account_json_file)
		transaction_json_file = IO.read("assets/data/transactions.json")
		my_transactions = JSON.parse(transaction_json_file)
		sav_bal = my_accounts["data"][1..-1].sum { |bal| bal["attributes"]["balance"]["value"].to_f }

		stack :margin_top => "40", :margin_left => "20"  do
			title "$#{my_accounts["data"][0]["attributes"]["balance"]["value"]} AUD", align: "center", stroke: "#F97C68"
			para "Transactional Balance", align: "center", stroke: "#F5F3F9"
		end

		stack :margin_top => "20", :margin_bottom => "10", :margin_left => "20" do
			title "$#{sav_bal} AUD", align: "center", stroke: "#F97C68"
			para "Savings Balance", align: "center", stroke: "#F5F3F9"
		end

		my_accounts["data"].each do |list_s|
			stack :margin_top => "30", :margin_left => "380" do
				account_value = list_s["attributes"]["balance"]["value"]
				button "#{list_s["attributes"]["displayName"]} : $#{account_value} AUD", width: 680, height: 68 do
					window :title => "UP Flow - #{list_s["attributes"]["displayName"]}" do
						
						background "#262330"

						font "assets/setup/Circular.ttf" unless Shoes::FONTS.include?('Circular')

						description = []
						value = []
						date = []

						my_transactions["data"].each do |list_t|
							description << list_t["attributes"]["description"] if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
							value << list_t["attributes"]["amount"]["value"].to_f if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
							date << list_t["attributes"]["createdAt"] if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
						end

						stack :margin_top => "20", :margin_bottom => "10", :margin_left => "20" do
							title "$#{account_value} AUD", align: "center", stroke: "#F97C68"
							para "Current Balance", align: "center", stroke: "#F5F3F9"
						end
						
						date.each do |list_d|
							d = DateTime.parse("#{list_d}")
							value.each do |list_c|
								description.each do |list_b|
									stack :margin_top => "30", :margin_left => "38", :margin_right => "35" do
										background "#F5F3F9"
										para "#{list_b}", align: "center", size: "x-large", weight: "light"
										para "$ #{list_c} AUD", align: "center", size: "large"
										para "#{d.strftime('%d %b %Y at %I:%M %p')}", align: "center"
									end
								end
							end
						end
					
						stack :margin_bottom => "50" do	end

					end
				end
				stack :margin_bottom => "40" do	end
			end
		end
	end
end

Shoes.app :title => "UP Flow", width: 1400, height: 900, menus: true